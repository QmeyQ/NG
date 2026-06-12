import { Timer } from "../libs/time";

export enum MatchState {
    IDLE = 0,
    SERVING = 1,
    PLAYING = 2,
    ENDED = 3
}

export interface Player {
    id: number;
    team: 'A' | 'B';
    side: 'left' | 'right';
}

export class Match {
    public state: MatchState = MatchState.IDLE;
    
    public scoreA: number = 0;
    public scoreB: number = 0;
    public gamesWonA: number = 0;
    public gamesWonB: number = 0;
    
    public currentServer: Player | null = null;
    public lastHitter: Player | null = null;
    
    // 发球状态记录
    private serveStartPos: { x: number, z: number } | null = null;

    // 配置
    public maxScore: number = 21;
    public bestOf: number = 3;

    // 场地界线 (以网为中心)
    // 假设网在 X=0，A队在 -X 区域，B队在 +X 区域
    // 单打场地尺寸 (单位: 米)
    public court = {
        halfLength: 6.7, // 单边长 6.7m
        width: 5.18,     // 宽 5.18m
        serviceLineX: 1.98 // 发球线距离网 1.98m
    };

    public onScoreChanged?: (teamA: number, teamB: number) => void;
    public onGameEnded?: (winnerTeam: 'A' | 'B') => void;
    public onMatchEnded?: (winnerTeam: 'A' | 'B') => void;
    public onSideSwitch?: () => void;
    public onServerChanged?: (server: Player) => void;

    private _players: Player[] = [];

    constructor(players: Player[]) {
        this._players = players;
        this.resetMatch();
    }

    public resetMatch(): void {
        this.gamesWonA = 0;
        this.gamesWonB = 0;
        this.resetGame();
        // 初始发球权随机或约定
        this.currentServer = this._players[0];
        if (this.onServerChanged) this.onServerChanged(this.currentServer);
    }

    public resetGame(): void {
        this.scoreA = 0;
        this.scoreB = 0;
        this.state = MatchState.IDLE;
        if (this.onScoreChanged) this.onScoreChanged(this.scoreA, this.scoreB);
    }

    public startGame(): void {
        this.state = MatchState.SERVING;
        this.serveStartPos = null;
        // 准备发球逻辑
    }

    public recordHit(player: Player, hitPos?: {x: number, z: number}): void {
        if (this.state === MatchState.SERVING) {
            this.state = MatchState.PLAYING;
            if (hitPos) {
                this.serveStartPos = hitPos;
            }
        }
        this.lastHitter = player;
    }

    /**
     * 判断球落地得分
     * @param x 球落地X
     * @param z 球落地Z
     */
    public onBallLand(x: number, z: number): void {
        if (this.state !== MatchState.PLAYING) return;

        let winnerTeam: 'A' | 'B';

        // 检查发球合法性（如果是第一拍落地）
        if (this.serveStartPos && this.lastHitter === this.currentServer) {
            const isServeValid = this.checkServeValid(x, z);
            if (!isServeValid) {
                // 发球出界或未进入对应接发球区
                winnerTeam = this.lastHitter?.team === 'A' ? 'B' : 'A';
                this.serveStartPos = null;
                this.addScore(winnerTeam);
                return;
            }
            this.serveStartPos = null; // 发球合法，清除发球标记
        }

        // 普通击球判断出界
        const outOfBounds = Math.abs(x) > this.court.halfLength || Math.abs(z) > this.court.width / 2;


        if (outOfBounds) {
            // 出界，对方得分
            winnerTeam = this.lastHitter?.team === 'A' ? 'B' : 'A';
        } else {
            // 界内，判断落在谁的半场：落在A半场则B得分，落在B半场则A得分
            const landInATeam = x < 0;
            winnerTeam = landInATeam ? 'B' : 'A';
        }

        this.addScore(winnerTeam);
    }

    /**
     * 校验发球是否合法 (单打：双数右区发，单数左区发，必须对角线且过前发球线)
     */
    private checkServeValid(landX: number, landZ: number): boolean {
        if (!this.currentServer || !this.serveStartPos) return true;

        const serverScore = this.currentServer.team === 'A' ? this.scoreA : this.scoreB;
        const isEven = serverScore % 2 === 0;

        // 假设网在X=0。A队在 X < 0，B队在 X > 0。
        // Z > 0 为右半区 (从-X向+X看), Z < 0 为左半区?
        // 我们以绝对正负来区分：若A队(-X)，面朝+X，那么它的右半区是 Z > 0。
        // B队(+X)，面朝-X，右半区是 Z < 0。
        
        const serverX = this.serveStartPos.x;
        const serverZ = this.serveStartPos.z;

        // 1. 发球必须在自己的正确半区
        const isA = serverX < 0;
        const expectedServerZSign = isA ? (isEven ? 1 : -1) : (isEven ? -1 : 1);
        if (Math.sign(serverZ) !== Math.sign(expectedServerZSign)) {
            console.log("发球站位错误 (站错了左右区)");
            return false; // 站错区
        }

        // 2. 落地必须在对方的对角线区域 (即 Z 的符号应相反)
        if (Math.sign(landZ) === Math.sign(serverZ)) {
            console.log("发球落点未在对角线");
            return false; // 没有发到对角线
        }

        // 3. 必须过发球线
        if (Math.abs(landX) < this.court.serviceLineX) {
            console.log("发球未过前发球线");
            return false;
        }

        // 4. 不能出单打边界 (后界=端线，侧界=内侧线)
        // 假设单打侧界就是 width，或者稍微窄一点（标准单打宽 5.18m）
        if (Math.abs(landX) > this.court.halfLength || Math.abs(landZ) > this.court.width / 2) {
            console.log("发球出界");
            return false;
        }

        return true;
    }

    /**
     * 发球失误
     */
    public onServeFault(faultTeam: 'A' | 'B'): void {
        const winner = faultTeam === 'A' ? 'B' : 'A';
        this.addScore(winner);
    }

    private addScore(team: 'A' | 'B'): void {
        if (team === 'A') this.scoreA++;
        else this.scoreB++;

        if (this.onScoreChanged) this.onScoreChanged(this.scoreA, this.scoreB);

        // 分配发球权
        this.currentServer = this._players.find(p => p.team === team) || this._players[0];
        if (this.onServerChanged) this.onServerChanged(this.currentServer);

        // 检查局点
        if (this.checkGameWin()) {
            if (team === 'A') this.gamesWonA++;
            else this.gamesWonB++;

            if (this.onGameEnded) this.onGameEnded(team);

            // 检查赛点
            const winReq = Math.ceil(this.bestOf / 2);
            if (this.gamesWonA >= winReq || this.gamesWonB >= winReq) {
                this.state = MatchState.ENDED;
                if (this.onMatchEnded) this.onMatchEnded(team);
            } else {
                // 换边 & 开始新一局
                this.switchSides();
                this.resetGame();
            }
        } else {
            this.state = MatchState.SERVING;
        }
    }

    private checkGameWin(): boolean {
        // 21分制，需要领先2分。上限30分。
        const max = Math.max(this.scoreA, this.scoreB);
        const diff = Math.abs(this.scoreA - this.scoreB);

        if (max >= 30) return true; // 30分封顶
        if (max >= this.maxScore && diff >= 2) return true;

        return false;
    }

    private switchSides(): void {
        this._players.forEach(p => {
            p.side = p.side === 'left' ? 'right' : 'left';
        });
        if (this.onSideSwitch) this.onSideSwitch();
    }
}
