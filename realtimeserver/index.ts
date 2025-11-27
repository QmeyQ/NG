/**
 * Copyright 2024. Huawei Technologies Co., Ltd. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import GOBERTS from './GOBERTS';

// 存储房间信息的映射
const roomInfoMap: Map<string, GOBERTS.RoomInfo> = new Map();

// 定期广播房间和玩家信息的间隔时间（毫秒）
const BROADCAST_INTERVAL = 5000;

// 广播房间和玩家信息的函数
async function broadcastRoomAndPlayerInfo(args: GOBERTS.ActionArgs, sendReason: string, targetType: string = "all") {
    try {
        // 获取当前房间信息
        const roomInfo = await args.SDK.getRoomInfo();
        if (roomInfo) {
            // 更新房间信息映射
            roomInfoMap.set(args.roomId, roomInfo);
            
            // 构建广播消息，附带送达对象和发送原因
            const broadcastData = {
                type: "RoomAndPlayerInfo",
                roomInfo: roomInfo,
                timestamp: Date.now(),
                sendReason: sendReason, // 发送原因
                targetType: targetType, // 送达对象类型：all(所有玩家)、specific(特定玩家)、broadcast(广播)
                targetPlayers: roomInfo.players.map((p: any) => p.playerId), // 目标玩家列表
                serverInfo: {
                    appId: "5765880207855344723",
                    roomId: args.roomId
                }
            };
            
            // 向所有客户端广播消息
            await args.SDK.sendData(JSON.stringify(broadcastData));
            args.SDK.log.info(`Broadcasted room and player info for room: ${args.roomId}, reason: ${sendReason}, target: ${targetType}`);
        }
    } catch (error) {
        args.SDK.log.error(`Failed to broadcast room and player info: ${error}`);
    }
}

const gameServer: GOBERTS.GameServer = {
    onDestroyRoom(args: GOBERTS.ActionArgs): void {
        // 移除房间信息
        roomInfoMap.delete(args.roomId);
        args.SDK.log.info(`Room destroyed: ${args.roomId}`);
    },
    onCreateRoom(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Room created: ${args.roomId}`);
        // 立即广播一次房间信息
        broadcastRoomAndPlayerInfo(args, "房间创建").catch(err => {
            args.SDK.log.error(`Failed to broadcast on room create: ${err}`);
        });
        // 设置定期广播
        setInterval(() => {
            broadcastRoomAndPlayerInfo(args, "定期广播").catch(err => {
                args.SDK.log.error(`Failed to broadcast in interval: ${err}`);
            });
        }, BROADCAST_INTERVAL);
    },
    onRealTimeServerConnected(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('RealTimeServer connected');
        // 实时服务器连接时广播房间信息
        broadcastRoomAndPlayerInfo(args, "实时服务器连接").catch(err => {
            args.SDK.log.error(`Failed to broadcast on realtime server connected: ${err}`);
        });
    },
    onRealTimeServerDisconnected(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('RealTimeServer disconnected');
        // 实时服务器断开时广播房间信息
        broadcastRoomAndPlayerInfo(args, "实时服务器断开").catch(err => {
            args.SDK.log.error(`Failed to broadcast on realtime server disconnected: ${err}`);
        });
    },
    onConnect(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Client connected');
        // 客户端连接时广播房间信息
        broadcastRoomAndPlayerInfo(args, "客户端连接").catch(err => {
            args.SDK.log.error(`Failed to broadcast on connect: ${err}`);
        });
    },
    onDisconnect(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Client disconnected');
        // 客户端断开时广播房间信息
        broadcastRoomAndPlayerInfo(args, "客户端断开").catch(err => {
            args.SDK.log.error(`Failed to broadcast on disconnect: ${err}`);
        });
    },

    onJoin(playerInfo: GOBERTS.FramePlayerInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Player joined: ${playerInfo.playerId}`);
        // 玩家加入时广播房间信息
        broadcastRoomAndPlayerInfo(args, "玩家加入", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player join: ${err}`);
        });
    },
    onLeave(playerInfo: GOBERTS.FramePlayerInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Player left: ${playerInfo.playerId}`);
        // 玩家离开时广播房间信息
        broadcastRoomAndPlayerInfo(args, "玩家离开", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player leave: ${err}`);
        });
    },
    onRecvFrame(msg: GOBERTS.RecvFrameMessage | GOBERTS.RecvFrameMessage[], args: GOBERTS.ActionArgs): void {
        // 处理帧数据，用于测试
        broadcastRoomAndPlayerInfo(args, "收到帧数据", "broadcast").catch(err => {
            args.SDK.log.error(`Failed to broadcast on recv frame: ${err}`);
        });
    },
    onRecvFromClientV2(msg: GOBERTS.RecvFromClientInfo, args: GOBERTS.ActionArgs): void {
        // 处理客户端消息，用于测试
        broadcastRoomAndPlayerInfo(args, "收到客户端消息", "broadcast").catch(err => {
            args.SDK.log.error(`Failed to broadcast on recv client message: ${err}`);
        });
    },
    onRoomPropertiesChange(msg: GOBERTS.UpdateRoomInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Room properties changed');
        // 房间属性变化时广播房间信息
        broadcastRoomAndPlayerInfo(args, "房间属性变化").catch(err => {
            args.SDK.log.error(`Failed to broadcast on room properties change: ${err}`);
        });
    },
    onStartFrameSync(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Frame sync started');
        // 帧同步开始时广播房间信息
        broadcastRoomAndPlayerInfo(args, "帧同步开始").catch(err => {
            args.SDK.log.error(`Failed to broadcast on start frame sync: ${err}`);
        });
    },
    onStopFrameSync(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Frame sync stopped');
        // 帧同步停止时广播房间信息
        broadcastRoomAndPlayerInfo(args, "帧同步停止").catch(err => {
            args.SDK.log.error(`Failed to broadcast on stop frame sync: ${err}`);
        });
    },
    onUpdateCustomProperties(player: GOBERTS.FramePlayerPropInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Player custom properties updated: ${player.playerId}`);
        // 玩家自定义属性变化时广播房间信息
        broadcastRoomAndPlayerInfo(args, "玩家属性更新", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player properties update: ${err}`);
        });
    },
    onUpdateCustomStatus(msg: GOBERTS.PlayerStatusInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Player status updated: ${msg.playerId}`);
        // 玩家状态变化时广播房间信息
        broadcastRoomAndPlayerInfo(args, "玩家状态更新", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player status update: ${err}`);
        });
    },
    onRequestFrameError(error: GOBERTS.GOBEError, args: GOBERTS.ActionArgs): void {
        args.SDK.log.error(`Frame request error: ${error}`);
    },
    onRoomPropertiesChangeFailed(error: GOBERTS.GOBEError, args:GOBERTS.ActionArgs): void {
        args.SDK.log.error(`Room properties change failed: ${error}`);
    },
    onInstantMessageFailed(error: GOBERTS.GOBEError, args:GOBERTS.ActionArgs): void {
        args.SDK.log.error(`Instant message failed: ${error}`);
    },
}

export const gobeDeveloperCode = {
    gameServer: gameServer,
    appId: '5765880207855344723',
};