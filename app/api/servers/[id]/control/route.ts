import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { vf } from "@/lib/virtfusion";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { action, virtfusionId } = await request.json();

        if (!["start", "stop", "restart"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        // Map actions to VirtFusion API actions
        const actionMap: Record<string, "boot" | "shutdown" | "restart"> = {
            start: "boot",
            stop: "shutdown",
            restart: "restart",
        };

        // Execute the action via VirtFusion API
        const result = await vf.power(virtfusionId, actionMap[action]);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Failed to control server" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Server ${action} initiated successfully`,
            data: result.data,
        });
    } catch (error: any) {
        console.error("Server control error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to control server" },
            { status: 500 }
        );
    }
}
