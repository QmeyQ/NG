/**
 * Copyright 2024. Huawei Technologies Co., Ltd. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org.cn/LICENSE-2.0
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

// 存储房间游戏状态的映射
interface RoomGameState {
    roomId: string;
    playerCount: number;
    maxPlayers: number;
    readyPlayers: Set<string>;
    gameStarted: boolean;
    matchState: string | null;
    lastUpdate: number;
}
const roomGameStateMap: Map<string, RoomGameState> = new Map();

// 定期广播房间和玩家信息的间隔时间（毫秒）
const BROADCAST_INTERVAL = 5000;

// 广播房间和玩家信息的函数
async function broadcastRoomAndPlayerInfo(args: GOBERTS.ActionArgs, sendReason: string, targetType: string = "all") {
    try {
        const roomInfo = await args.SDK.getRoomInfo();
        if (roomInfo) {
            roomInfoMap.set(args.roomId, roomInfo);

            const broadcastData = {
                type: "RoomAndPlayerInfo",
                roomInfo: roomInfo,
                timestamp: Date.now(),
                sendReason: sendReason,
                targetType: targetType,
                targetPlayers: roomInfo.players.map((p: any) => p.playerId),
                serverInfo: {
                    appId: "5765880207855344723",
                    roomId: args.roomId
                }
            };

            await args.SDK.sendData(JSON.stringify(broadcastData));
            args.SDK.log.info(`Broadcasted room and player info for room: ${args.roomId}, reason: ${sendReason}, target: ${targetType}`);
        }
    } catch (error) {
        args.SDK.log.error(`Failed to broadcast room and player info: ${error}`);
    }
}

// 获取或创建房间游戏状态
function getOrCreateGameState(roomId: string, maxPlayers: number = 4): RoomGameState {
    let state = roomGameStateMap.get(roomId);
    if (!state) {
        state = {
            roomId,
            playerCount: 0,
            maxPlayers,
            readyPlayers: new Set(),
            gameStarted: false,
            matchState: null,
            lastUpdate: Date.now(),
        };
        roomGameStateMap.set(roomId, state);
    }
    return state;
}

// 广播游戏状态给房间内所有客户端
async function broadcastGameState(args: GOBERTS.ActionArgs, gameState: RoomGameState) {
    try {
        const data = {
            type: "GameStateSync",
            roomId: args.roomId,
            gameStarted: gameState.gameStarted,
            readyPlayers: Array.from(gameState.readyPlayers),
            matchState: gameState.matchState,
            playerCount: gameState.playerCount,
            maxPlayers: gameState.maxPlayers,
            timestamp: Date.now(),
        };
        await args.SDK.sendData(JSON.stringify(data));
        args.SDK.log.info(`Broadcasted game state for room: ${args.roomId}, started: ${gameState.gameStarted}`);
    } catch (error) {
        args.SDK.log.error(`Failed to broadcast game state: ${error}`);
    }
}

// 检查房间是否满员并通知客户端
async function checkRoomFullAndNotify(args: GOBERTS.ActionArgs) {
    try {
        const roomInfo = await args.SDK.getRoomInfo();
        if (!roomInfo) return;

        const gameState = getOrCreateGameState(args.roomId, roomInfo.maxPlayers);
        gameState.playerCount = roomInfo.players.length;

        // 房间满员，通知所有客户端开始游戏
        if (roomInfo.players.length >= roomInfo.maxPlayers && !gameState.gameStarted) {
            gameState.gameStarted = true;
            const startData = {
                type: "GameStart",
                roomId: args.roomId,
                playerCount: roomInfo.players.length,
                players: roomInfo.players.map((p: any) => ({
                    playerId: p.playerId,
                    customPlayerProperties: p.customPlayerProperties,
                })),
                timestamp: Date.now(),
            };
            await args.SDK.sendData(JSON.stringify(startData));
            args.SDK.log.info(`Room ${args.roomId} is full, game start notified. Players: ${roomInfo.players.length}`);
        }
    } catch (error) {
        args.SDK.log.error(`Failed to check room full: ${error}`);
    }
}

const gameServer: GOBERTS.GameServer = {
    onDestroyRoom(args: GOBERTS.ActionArgs): void {
        roomInfoMap.delete(args.roomId);
        roomGameStateMap.delete(args.roomId);
        args.SDK.log.info(`Room destroyed: ${args.roomId}`);
    },
    onCreateRoom(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Room created: ${args.roomId}`);
        getOrCreateGameState(args.roomId);
        broadcastRoomAndPlayerInfo(args, "房间创建").catch(err => {
            args.SDK.log.error(`Failed to broadcast on room create: ${err}`);
        });
        setInterval(() => {
            broadcastRoomAndPlayerInfo(args, "定期广播").catch(err => {
                args.SDK.log.error(`Failed to broadcast in interval: ${err}`);
            });
        }, BROADCAST_INTERVAL);
    },
    onRealTimeServerConnected(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('RealTimeServer connected');
        broadcastRoomAndPlayerInfo(args, "实时服务器连接").catch(err => {
            args.SDK.log.error(`Failed to broadcast on realtime server connected: ${err}`);
        });
    },
    onRealTimeServerDisconnected(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('RealTimeServer disconnected');
        broadcastRoomAndPlayerInfo(args, "实时服务器断开").catch(err => {
            args.SDK.log.error(`Failed to broadcast on realtime server disconnected: ${err}`);
        });
    },
    onConnect(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Client connected');
        broadcastRoomAndPlayerInfo(args, "客户端连接").catch(err => {
            args.SDK.log.error(`Failed to broadcast on connect: ${err}`);
        });
    },
    onDisconnect(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Client disconnected');
        broadcastRoomAndPlayerInfo(args, "客户端断开").catch(err => {
            args.SDK.log.error(`Failed to broadcast on disconnect: ${err}`);
        });
    },

    onJoin(playerInfo: GOBERTS.FramePlayerInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Player joined: ${playerInfo.playerId}`);
        broadcastRoomAndPlayerInfo(args, "玩家加入", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player join: ${err}`);
        });
        // 检查房间是否满员
        checkRoomFullAndNotify(args).catch(err => {
            args.SDK.log.error(`Failed to check room full on join: ${err}`);
        });
    },
    onLeave(playerInfo: GOBERTS.FramePlayerInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Player left: ${playerInfo.playerId}`);
        const gameState = roomGameStateMap.get(args.roomId);
        if (gameState) {
            gameState.readyPlayers.delete(playerInfo.playerId);
        }
        broadcastRoomAndPlayerInfo(args, "玩家离开", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player leave: ${err}`);
        });
    },

    /**
     * 帧数据接收：SDK 自动将帧数据广播给所有客户端
     * 服务器端仅做监控和日志，无需手动转发
     */
    onRecvFrame(msg: GOBERTS.RecvFrameMessage | GOBERTS.RecvFrameMessage[], args: GOBERTS.ActionArgs): void {
        const frames = Array.isArray(msg) ? msg : [msg];
        for (const frame of frames) {
            const playerCount = frame.frameInfo?.length ?? 0;
            if (args.SDK.getAutoFrame()) {
                // 自动帧模式：SDK 自动转发，仅记录日志
                args.SDK.log.info(`Frame received: room=${args.roomId}, players=${playerCount}, frameId=${frame.currentRoomFrameId}`);
            } else {
                // 手动帧模式：需要手动转发帧数据
                const frameData = {
                    type: "FrameBroadcast",
                    frameId: frame.currentRoomFrameId,
                    frameInfo: frame.frameInfo,
                    timestamp: frame.time,
                };
                args.SDK.sendData(JSON.stringify(frameData)).catch(err => {
                    args.SDK.log.error(`Failed to broadcast frame: ${err}`);
                });
            }
        }
    },

    /**
     * 客户端自定义消息处理：对局状态同步、玩家准备等
     */
    onRecvFromClientV2(msg: GOBERTS.RecvFromClientInfo, args: GOBERTS.ActionArgs): void {
        try {
            const data = JSON.parse(msg.msg);
            const gameState = getOrCreateGameState(args.roomId);

            switch (data.type) {
                case "StateChange": {
                    // 对局状态变更（得分、阶段变更等），由房主发送
                    gameState.matchState = data.state;
                    gameState.lastUpdate = Date.now();
                    // 广播给所有客户端
                    const broadcastMsg = {
                        type: "StateSync",
                        state: data.state,
                        sender: msg.srcPlayer,
                        timestamp: Date.now(),
                    };
                    args.SDK.sendData(JSON.stringify(broadcastMsg)).catch(err => {
                        args.SDK.log.error(`Failed to broadcast state change: ${err}`);
                    });
                    args.SDK.log.info(`State change from ${msg.srcPlayer}: ${data.state}`);
                    break;
                }
                case "PlayerReady": {
                    // 玩家准备
                    gameState.readyPlayers.add(msg.srcPlayer);
                    args.SDK.log.info(`Player ${msg.srcPlayer} is ready. Ready: ${gameState.readyPlayers.size}/${gameState.maxPlayers}`);
                    broadcastGameState(args, gameState).catch(err => {
                        args.SDK.log.error(`Failed to broadcast game state: ${err}`);
                    });
                    break;
                }
                case "RequestState": {
                    // 新玩家请求当前对局状态
                    if (gameState.matchState) {
                        const stateMsg = {
                            type: "StateSync",
                            state: gameState.matchState,
                            sender: "server",
                            timestamp: Date.now(),
                        };
                        args.SDK.sendData(JSON.stringify(stateMsg), [msg.srcPlayer]).catch(err => {
                            args.SDK.log.error(`Failed to send state to ${msg.srcPlayer}: ${err}`);
                        });
                    }
                    break;
                }
                case "HitEvent": {
                    // 击球事件，广播给其他玩家
                    const hitMsg = {
                        type: "HitBroadcast",
                        playerId: msg.srcPlayer,
                        hitData: data.hitData,
                        timestamp: Date.now(),
                    };
                    args.SDK.sendData(JSON.stringify(hitMsg)).catch(err => {
                        args.SDK.log.error(`Failed to broadcast hit event: ${err}`);
                    });
                    break;
                }
                default: {
                    // 未知消息类型，原样广播
                    args.SDK.log.info(`Unknown message type: ${data.type} from ${msg.srcPlayer}`);
                    break;
                }
            }
        } catch (error) {
            args.SDK.log.error(`Failed to process client message: ${error}`);
        }
    },

    onRoomPropertiesChange(msg: GOBERTS.UpdateRoomInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Room properties changed');
        broadcastRoomAndPlayerInfo(args, "房间属性变化").catch(err => {
            args.SDK.log.error(`Failed to broadcast on room properties change: ${err}`);
        });
    },
    onStartFrameSync(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Frame sync started');
        const gameState = getOrCreateGameState(args.roomId);
        gameState.gameStarted = true;
        broadcastRoomAndPlayerInfo(args, "帧同步开始").catch(err => {
            args.SDK.log.error(`Failed to broadcast on start frame sync: ${err}`);
        });
    },
    onStopFrameSync(args: GOBERTS.ActionArgs): void {
        args.SDK.log.info('Frame sync stopped');
        const gameState = roomGameStateMap.get(args.roomId);
        if (gameState) {
            gameState.gameStarted = false;
        }
        broadcastRoomAndPlayerInfo(args, "帧同步停止").catch(err => {
            args.SDK.log.error(`Failed to broadcast on stop frame sync: ${err}`);
        });
    },
    onUpdateCustomProperties(player: GOBERTS.FramePlayerPropInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Player custom properties updated: ${player.playerId}`);
        broadcastRoomAndPlayerInfo(args, "玩家属性更新", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player properties update: ${err}`);
        });
    },
    onUpdateCustomStatus(msg: GOBERTS.PlayerStatusInfo, args: GOBERTS.ActionArgs): void {
        args.SDK.log.info(`Player status updated: ${msg.playerId}`);
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
