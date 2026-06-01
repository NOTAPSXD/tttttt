import { EC2Client, DescribeInstancesCommand, InstanceStateName } from '@aws-sdk/client-ec2';
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { connectDB } from './mongodb';
import { VPSServer } from './models';

interface AwsClients {
    ec2: EC2Client;
    cloudwatch: CloudWatchClient;
}

const clientCache: Record<string, AwsClients> = {};

/**
 * 1. Multi-Region Support & 5. Reliability
 * Implements a factory function that caches EC2 and CloudWatch clients for any given AWS region.
 * Uses maxAttempts for native retry logic handling 429 and network errors.
 */
export const getAwsClients = (region: string): AwsClients => {
    if (!clientCache[region]) {
        // We use maxAttempts for reliability (retry logic for rate limits/temporary network failures)
        const config = {
            region,
            maxAttempts: 5,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            }
        };

        clientCache[region] = {
            ec2: new EC2Client(config),
            cloudwatch: new CloudWatchClient(config),
        };
    }
    return clientCache[region];
};

export interface UnifiedInstance {
    instanceId: string;
    publicIp: string | null;
    instanceType: string;
    powerState: InstanceStateName | string;
    region: string;
    name: string;
    status: 'Assigned' | 'Available';
    userId?: string;
    dbRecord?: any;
}

const SUPPORTED_REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1', 'ap-southeast-1'];

/**
 * 2. Inventory Fetching & 3. Database Linkage
 * Lists all instances across multiple regions in parallel, and cross-references them
 * with the MongoDB 'vps_servers' collection.
 */
export const fetchAndSyncInventory = async (regions: string[] = SUPPORTED_REGIONS): Promise<UnifiedInstance[]> => {
    await connectDB();

    const fetchRegionInstances = async (region: string) => {
        try {
            const { ec2 } = getAwsClients(region);
            const command = new DescribeInstancesCommand({});
            const response = await ec2.send(command);
            
            const instances: any[] = [];
            response.Reservations?.forEach(reservation => {
                reservation.Instances?.forEach(instance => {
                    if (instance.InstanceId) {
                        instances.push({
                            instanceId: instance.InstanceId,
                            publicIp: instance.PublicIpAddress || null,
                            instanceType: instance.InstanceType || 'unknown',
                            powerState: instance.State?.Name || 'unknown',
                            region,
                            name: instance.Tags?.find(t => t.Key === 'Name')?.Value || instance.InstanceId,
                        });
                    }
                });
            });
            return instances;
        } catch (error) {
            console.error(`Error fetching instances in region ${region}:`, error);
            return [];
        }
    };

    // Fetch instances from all regions in parallel
    const regionResults = await Promise.all(regions.map(fetchRegionInstances));
    const allAwsInstances = regionResults.flat();

    // Fetch all DB records
    const dbRecords = await VPSServer.find({}).lean();
    const dbRecordMap = new Map(dbRecords.map(record => [record.instanceId, record]));

    const unifiedInventory: UnifiedInstance[] = allAwsInstances.map(awsInstance => {
        const dbRecord = dbRecordMap.get(awsInstance.instanceId);
        let status: 'Assigned' | 'Available' = 'Available';
        let userId = undefined;

        if (dbRecord) {
            if (dbRecord.userId) {
                status = 'Assigned';
                userId = dbRecord.userId.toString();
            }
        }

        return {
            ...awsInstance,
            status,
            userId,
            dbRecord,
        };
    });

    return unifiedInventory;
};

/**
 * 4. Resource Monitoring
 * Fetch the latest CPU Utilization percentage from CloudWatch for a specific instance.
 */
export const fetchCpuUtilization = async (region: string, instanceId: string): Promise<number | null> => {
    try {
        const { cloudwatch } = getAwsClients(region);
        
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // last 5 minutes
        
        const command = new GetMetricStatisticsCommand({
            Namespace: 'AWS/EC2',
            MetricName: 'CPUUtilization',
            Dimensions: [
                {
                    Name: 'InstanceId',
                    Value: instanceId
                }
            ],
            StartTime: startTime,
            EndTime: endTime,
            Period: 300,
            Statistics: ['Average']
        });

        const response = await cloudwatch.send(command);
        
        if (response.Datapoints && response.Datapoints.length > 0) {
            // Sort to get the latest datapoint
            const sorted = response.Datapoints.sort((a, b) => {
                return (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0);
            });
            return sorted[0].Average || null;
        }
        
        return null;
    } catch (error) {
        console.error(`Error fetching CPU utilization for ${instanceId} in ${region}:`, error);
        return null;
    }
};

/**
 * Additional helpers to control instance state
 */
import { StartInstancesCommand, StopInstancesCommand, RebootInstancesCommand } from '@aws-sdk/client-ec2';

export const startInstance = async (region: string, instanceId: string) => {
    const { ec2 } = getAwsClients(region);
    return ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
};

export const stopInstance = async (region: string, instanceId: string) => {
    const { ec2 } = getAwsClients(region);
    return ec2.send(new StopInstancesCommand({ InstanceIds: [instanceId] }));
};

export const rebootInstance = async (region: string, instanceId: string) => {
    const { ec2 } = getAwsClients(region);
    return ec2.send(new RebootInstancesCommand({ InstanceIds: [instanceId] }));
};
