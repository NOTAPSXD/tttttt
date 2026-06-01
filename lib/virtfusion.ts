import axios from 'axios';

const API_URL = process.env.VIRTFUSION_API_URL;
const API_TOKEN = process.env.VIRTFUSION_API_TOKEN;

if (!API_URL || !API_TOKEN) {
    console.error("VirtFusion API configuration missing");
}

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
});

export interface VirtFusionServer {
    id: string;
    name: string;
    hostname: string | null;
    memory: string;
    cpu: string;
    state?: {
        status: string;
        running: boolean;
        cpu: string;
        network: {
            primary: {
                traffic: {
                    rx: number;
                    tx: number;
                    total: number;
                }
            }
        }
    };
    storage: { capacity: string }[];
    network: {
        primary: {
            ipv4: { address: string }[];
            limit?: string; // "20000 GB"
        }
    };
}

export const vf = {
    getServers: async () => {
        try {
            const res = await client.get('/server?results=100');
            return res.data.data as VirtFusionServer[];
        } catch (error) {
            console.error('VF GetServers Error:', error);
            return [];
        }
    },

    getServer: async (id: string) => {
        try {
            const res = await client.get(`/server/${id}?state=true`);
            return res.data.data as VirtFusionServer;
        } catch (error) {
            console.error('VF GetServer Error:', error);
            return null;
        }
    },

    power: async (id: string, action: 'boot' | 'shutdown' | 'powerOff' | 'restart') => {
        try {
            const res = await client.post(`/server/${id}/${action}`);
            return { success: true, data: res.data };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    getVNC: async (id: string) => {
        try {
            const res = await client.get(`/server/${id}/vnc`);
            return res.data.data;
        } catch (error: any) {
            return { error: error.response?.data?.message || 'Failed to get VNC' };
        }
    },

    resetPassword: async (id: string) => {
        try {
            // Send required 'user' parameter (defaulting to 'root')
            const res = await client.post(`/server/${id}/resetPassword`, { user: 'root' });
            return res.data.data; // { task: {...}, expectedPassword: "..." }
        } catch (error: any) {
            console.error('VirtFusion resetPassword error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0] || error.response?.data?.message || 'Password reset failed');
        }
    },

    getTasks: async (id: string) => {
        try {
            const res = await client.get(`/server/${id}/tasks`);
            return res.data.data;
        } catch (error: any) {
            console.error(error);
            return [];
        }
    }
};
