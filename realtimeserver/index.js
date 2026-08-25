'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

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
// 存储房间信息的映射
const roomInfoMap = new Map();
const roomGameStateMap = new Map();
// 定期广播房间和玩家信息的间隔时间（毫秒）
const BROADCAST_INTERVAL = 50000;
// 广播房间和玩家信息的函数
// 广播房间和玩家信息的函数
// function broadcastRoomAndPlayerInfo(args, sendReason, targetType = "all") {
//     return __awaiter(this, void 0, void 0, function* () {
//         try {
//             const roomInfo = yield args.SDK.getRoomInfo();
//             if (roomInfo) {
//                 roomInfoMap.set(args.roomId, roomInfo);
                
//                 // ✅ 修复：更新 gameState 中的玩家数量
//                 const gameState = getOrCreateGameState(args.roomId, roomInfo.maxPlayers);
//                 gameState.playerCount = roomInfo.players.length;
                
//                 const broadcastData = {
//                     type: "RoomAndPlayerInfo",
//                     roomInfo: roomInfo,
//                     timestamp: Date.now(),
//                     sendReason: sendReason,
//                     targetType: targetType,
//                     targetPlayers: roomInfo.players.map((p) => p.playerId),
//                     serverInfo: {
//                         appId: "5765880207855344723",
//                         roomId: args.roomId
//                     }
//                 };
//                 yield args.SDK.sendData(JSON.stringify(broadcastData));
//                 args.SDK.log.info(`Broadcasted room and player info for room: ${args.roomId}, reason: ${sendReason}, target: ${targetType}`);
//             }
//         }
//         catch (error) {
//             args.SDK.log.error(`Failed to broadcast room and player info: ${error}`);
//         }
//     });
// }

// 获取或创建房间游戏状态
function getOrCreateGameState(roomId, maxPlayers = 4) {
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
            ownerId: null, // ✅ 新增：记录房主ID
        };
        roomGameStateMap.set(roomId, state);
    }
    return state;
}

// 广播游戏状态给房间内所有客户端
function broadcastGameState(args, gameState) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = {
                type: "GameStateSync",
                roomId: args.roomId,
                gameStarted: gameState.gameStarted,
                readyPlayers: Array.from(gameState.readyPlayers),
                matchState: gameState.matchState,
                playerCount: gameState.playerCount,
                maxPlayers: gameState.maxPlayers,
                ownerId: gameState.ownerId, // ✅ 广播房主ID
                timestamp: Date.now(),
            };
            yield args.SDK.sendData(JSON.stringify(data));
            args.SDK.log.info(`Broadcasted game state for room: ${args.roomId}, started: ${gameState.gameStarted}, owner: ${gameState.ownerId}`);
        }
        catch (error) {
            args.SDK.log.error(`Failed to broadcast game state: ${error}`);
        }
    });
}
// 检查房间是否满员并通知客户端
function checkRoomFullAndNotify(args) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const roomInfo = yield args.SDK.getRoomInfo();
            if (!roomInfo)
                return;
            const gameState = getOrCreateGameState(args.roomId, roomInfo.maxPlayers);
            gameState.playerCount = roomInfo.players.length;
            // 房间满员，通知所有客户端开始游戏
            if (roomInfo.players.length >= roomInfo.maxPlayers && !gameState.gameStarted) {
                gameState.gameStarted = true;
                const startData = {
                    type: "GameStart",
                    roomId: args.roomId,
                    playerCount: roomInfo.players.length,
                    players: roomInfo.players.map((p) => ({
                        playerId: p.playerId,
                        customPlayerProperties: p.customPlayerProperties,
                    })),
                    timestamp: Date.now(),
                };
                yield args.SDK.sendData(JSON.stringify(startData));
                args.SDK.log.info(`Room ${args.roomId} is full, game start notified. Players: ${roomInfo.players.length}`);
            }
        }
        catch (error) {
            args.SDK.log.error(`Failed to check room full: ${error}`);
        }
    });
}
const gameServer = {
    onDestroyRoom(args) {
        roomInfoMap.delete(args.roomId);
        roomGameStateMap.delete(args.roomId);
        args.SDK.log.info(`Room destroyed: ${args.roomId}`);
    },
    onCreateRoom(args) {
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
    onRealTimeServerConnected(args) {
        args.SDK.log.info('RealTimeServer connected');
        broadcastRoomAndPlayerInfo(args, "实时服务器连接").catch(err => {
            args.SDK.log.error(`Failed to broadcast on realtime server connected: ${err}`);
        });
    },
    onRealTimeServerDisconnected(args) {
        args.SDK.log.info('RealTimeServer disconnected');
        broadcastRoomAndPlayerInfo(args, "实时服务器断开").catch(err => {
            args.SDK.log.error(`Failed to broadcast on realtime server disconnected: ${err}`);
        });
    },
    onConnect(args) {
        args.SDK.log.info('Client connected');
        broadcastRoomAndPlayerInfo(args, "客户端连接").catch(err => {
            args.SDK.log.error(`Failed to broadcast on connect: ${err}`);
        });
    },
    onDisconnect(args) {
        args.SDK.log.info('Client disconnected');
        broadcastRoomAndPlayerInfo(args, "客户端断开").catch(err => {
            args.SDK.log.error(`Failed to broadcast on disconnect: ${err}`);
        });
    },
    onJoin(playerInfo, args) {
        args.SDK.log.info(`Player joined: ${playerInfo.playerId}`);
        const gameState = getOrCreateGameState(args.roomId);
        
        // ✅ 修复：如果房主为空，设置当前玩家为房主
        if (!gameState.ownerId) {
            gameState.ownerId = playerInfo.playerId;
            args.SDK.log.info(`Player ${playerInfo.playerId} set as room owner.`);
        }
        
        broadcastRoomAndPlayerInfo(args, "玩家加入", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player join: ${err}`);
        });
        // 检查房间是否满员
        checkRoomFullAndNotify(args).catch(err => {
            args.SDK.log.error(`Failed to check room full on join: ${err}`);
        });
    },
    onLeave(playerInfo, args) {
        args.SDK.log.info(`Player left: ${playerInfo.playerId}`);
        const gameState = roomGameStateMap.get(args.roomId);
        if (gameState) {
            gameState.readyPlayers.delete(playerInfo.playerId);
            
            // ✅ 修复：如果离开的是房主，转移房主权限
            if (gameState.ownerId === playerInfo.playerId) {
                const roomInfo = roomInfoMap.get(args.roomId);
                const remainingPlayers = roomInfo ? roomInfo.players.filter(p => p.playerId !== playerInfo.playerId) : [];
                if (remainingPlayers.length > 0) {
                    gameState.ownerId = remainingPlayers[0].playerId;
                    args.SDK.log.info(`Room owner changed to ${gameState.ownerId}`);
                    // 通知客户端房主变更
                    const ownerChangeMsg = {
                        type: "OwnerChange",
                        ownerId: gameState.ownerId,
                    };
                    args.SDK.sendData(JSON.stringify(ownerChangeMsg)).catch(e => 
                        args.SDK.log.error(`Failed to broadcast owner change: ${e}`)
                    );
                } else {
                    gameState.ownerId = null;
                }
            }
        }
        broadcastRoomAndPlayerInfo(args, "玩家离开", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player leave: ${err}`);
        });
    },
    /**
     * 帧数据接收：SDK 自动将帧数据广播给所有客户端
     * 服务器端仅做监控和日志，无需手动转发
     */
    onRecvFrame(msg, args) {
        var _a, _b;
        const frames = Array.isArray(msg) ? msg : [msg];
        for (const frame of frames) {
            const playerCount = (_b = (_a = frame.frameInfo) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
            if (args.SDK.getAutoFrame()) {
                // 自动帧模式：SDK 自动转发，仅记录日志
                args.SDK.log.info(`Frame received: room=${args.roomId}, players=${playerCount}, frameId=${frame.currentRoomFrameId}`);
            }
            else {
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
    onRecvFromClientV2(msg, args) {
        try {
            const data = JSON.parse(msg.msg);
            const gameState = getOrCreateGameState(args.roomId);
            switch (data.type) {
                case "StateChange": {
                    // ✅ 修复：只有房主可以发送状态变更
                    if (gameState.ownerId !== msg.srcPlayer) {
                        args.SDK.log.warn(`Non-owner player ${msg.srcPlayer} attempted state change. Ignored.`);
                        return;
                    }
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
                    args.SDK.log.info(`State change from owner ${msg.srcPlayer}: ${data.state}`);
                    break;
                }
                case "FrameData": {
                    // ✅ 新增：处理客户端通过 sendData 发送的位置帧数据
                    const broadcastMsg = {
                        type: "FrameBroadcast",
                        playerId: msg.srcPlayer,
                        frameData: data.frameData, // 假设客户端发送的数据结构中有 frameData
                        timestamp: Date.now(),
                    };
                    args.SDK.sendData(JSON.stringify(broadcastMsg)).catch(err => {
                        args.SDK.log.error(`Failed to broadcast frame data: ${err}`);
                    });
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
                    // 击球事件，广播给其他客户端
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
        }
        catch (error) {
            args.SDK.log.error(`Failed to process client message: ${error}`);
        }
    },
    onRoomPropertiesChange(msg, args) {
        args.SDK.log.info('Room properties changed');
        broadcastRoomAndPlayerInfo(args, "房间属性变化").catch(err => {
            args.SDK.log.error(`Failed to broadcast on room properties change: ${err}`);
        });
    },
    onStartFrameSync(args) {
        args.SDK.log.info('Frame sync started');
        const gameState = getOrCreateGameState(args.roomId);
        gameState.gameStarted = true;
        broadcastRoomAndPlayerInfo(args, "帧同步开始").catch(err => {
            args.SDK.log.error(`Failed to broadcast on start frame sync: ${err}`);
        });
    },
    onStopFrameSync(args) {
        args.SDK.log.info('Frame sync stopped');
        const gameState = roomGameStateMap.get(args.roomId);
        if (gameState) {
            gameState.gameStarted = false;
        }
        broadcastRoomAndPlayerInfo(args, "帧同步停止").catch(err => {
            args.SDK.log.error(`Failed to broadcast on stop frame sync: ${err}`);
        });
    },
    onUpdateCustomProperties(player, args) {
        args.SDK.log.info(`Player custom properties updated: ${player.playerId}`);
        broadcastRoomAndPlayerInfo(args, "玩家属性更新", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player properties update: ${err}`);
        });
    },
    onUpdateCustomStatus(msg, args) {
        args.SDK.log.info(`Player status updated: ${msg.playerId}`);
        broadcastRoomAndPlayerInfo(args, "玩家状态更新", "specific").catch(err => {
            args.SDK.log.error(`Failed to broadcast on player status update: ${err}`);
        });
    },
    onRequestFrameError(error, args) {
        args.SDK.log.error(`Frame request error: ${error}`);
    },
    onRoomPropertiesChangeFailed(error, args) {
        args.SDK.log.error(`Room properties change failed: ${error}`);
    },
    onInstantMessageFailed(error, args) {
        args.SDK.log.error(`Instant message failed: ${error}`);
    },
};
const gobeDeveloperCode = {
    gameServer: gameServer,
    appId: '5765880207855344723',
};

exports.gobeDeveloperCode = gobeDeveloperCode;