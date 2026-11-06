/** mag.js - 超级管理终端前端(配合 AGC 独立 mag 云函数) */
(function () {
    'use strict';

    // ==================== 配置 ====================
    // 独立 mag 函数(管理用户数据): POST { name: "mag", data: { t, d } }
    var API_BASE = 'https://www.normalgame.cn/';
    var TOKEN_KEY = 'mag_token';

    var $ = function (id) { return document.getElementById(id); };
    var token = sessionStorage.getItem(TOKEN_KEY) || '';
    var users = [];          // 当前列表数据
    var curUserid = null;    // 正在编辑的用户
    var curBag = {};         // 正在编辑的背包

    // ==================== API ====================

    function call(t, d, cb) {
        var body = { name: 'mag', data: { t: t, d: d || {} } };
        fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (r) { return r.json(); }).then(function (res) {
            cb(res);
        }).catch(function (e) {
            cb({ code: -1, msg: '网络异常: ' + e.message });
        });
    }

    // ==================== 工具 ====================

    function toast(msg, err) {
        var el = $('toast');
        el.textContent = msg;
        el.className = err ? 'err' : '';
        el.style.display = 'block';
        clearTimeout(el.__t);
        el.__t = setTimeout(function () { el.style.display = 'none'; }, err ? 3000 : 1800);
    }

    function fmtTime(n) {
        if (!n) return '-';
        var d = new Date(n);
        function p(x) { return x < 10 ? '0' + x : x; }
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
            + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /** 云端返回码非 0 且为 2 时 token 失效, 回登录页 */
    function authFail(res) {
        if (res && res.code === 2) {
            token = '';
            sessionStorage.removeItem(TOKEN_KEY);
            showLogin();
            return true;
        }
        return false;
    }

    // ==================== 视图切换 ====================

    function showLogin() {
        $('loginView').style.display = 'flex';
        $('mainView').style.display = 'none';
    }

    function showMain() {
        $('loginView').style.display = 'none';
        $('mainView').style.display = 'block';
    }

    // ==================== 登录 ====================

    function doLogin() {
        var u = $('inUser').value.trim();
        var p = $('inPass').value;
        $('loginErr').textContent = '';
        call('login', { u: u, p: p }, function (res) {
            if (res.code === 0 && res.token) {
                token = res.token;
                sessionStorage.setItem(TOKEN_KEY, token);
                showMain();
                loadList();
            } else {
                $('loginErr').textContent = res.msg || '登录失败';
            }
        });
    }

    function doLogout() {
        if (!confirm('确定退出登录?')) return;
        token = '';
        sessionStorage.removeItem(TOKEN_KEY);
        showLogin();
    }

    function doPasswd() {
        var u = prompt('新管理员账号:');
        if (u === null) return;
        u = u.trim();
        if (!u) { toast('账号不能为空', 1); return; }
        var p = prompt('新密码:');
        if (p === null) return;
        call('passwd', { token: token, u: u, p: p }, function (res) {
            if (authFail(res)) return;
            if (res.code === 0) {
                token = res.token;
                sessionStorage.setItem(TOKEN_KEY, token);
                toast('管理员账号密码已修改');
            } else toast(res.msg || '修改失败', 1);
        });
    }

    // ==================== 用户列表 ====================

    function loadList() {
        call('list', { token: token }, function (res) {
            if (authFail(res)) return;
            if (res.code !== 0) { toast(res.msg || '加载失败', 1); return; }
            users = res.users || [];
            renderList();
        });
    }

    function renderList() {
        var kw = $('inSearch').value.trim().toLowerCase();
        var rows = users.filter(function (u) {
            if (!kw) return true;
            return (u.userid + '').toLowerCase().indexOf(kw) >= 0
                || (u.name || '').toLowerCase().indexOf(kw) >= 0
                || (u.flag || '').toLowerCase().indexOf(kw) >= 0;
        });
        var html = rows.map(function (u) {
            return '<tr>'
                + '<td>' + esc(u.userid) + '</td>'
                + '<td>' + esc(u.name) + '</td>'
                + '<td>' + esc(u.flag) + '</td>'
                + '<td>' + esc(u.head) + '</td>'
                + '<td class="dollar">' + (u.dollar ?? 0) + '</td>'
                + '<td>' + fmtTime(u.ctime) + '</td>'
                + '<td><button class="small" data-act="edit" data-id="' + esc(u.userid) + '">管理</button></td>'
                + '</tr>';
        }).join('');
        $('userRows').innerHTML = html || '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">无用户</td></tr>';
        $('userCount').textContent = '共 ' + rows.length + ' 个用户';
    }

    function onRowClick(e) {
        var btn = e.target.closest('button[data-act="edit"]');
        if (!btn) return;
        openEdit(btn.getAttribute('data-id'));
    }

    // ==================== 用户编辑 ====================

    function openEdit(userid) {
        call('get', { token: token, userid: userid }, function (res) {
            if (authFail(res)) return;
            if (res.code !== 0) { toast(res.msg || '查询失败', 1); return; }
            curUserid = userid;
            var u = res.user;
            $('editTitle').textContent = '用户编辑 - ' + u.userid;
            $('fUserid').textContent = u.userid;
            $('fName').value = u.name || '';
            $('fFlag').value = u.flag || '';
            $('fHead').value = u.head || '';
            $('fDollar').value = u.dollar ?? 0;
            $('fCtime').textContent = fmtTime(u.ctime);
            $('editPanel').classList.remove('hidden');
            curBag = res.bag || {};
            $('bagTitle').textContent = '背包管理 - ' + u.userid;
            renderBag();
            $('bagPanel').classList.remove('hidden');
            $('editPanel').scrollIntoView({ behavior: 'smooth' });
        });
    }

    function closeEdit() {
        $('editPanel').classList.add('hidden');
        $('bagPanel').classList.add('hidden');
        curUserid = null;
    }

    function saveUser() {
        if (curUserid === null) return;
        call('set', {
            token: token,
            userid: curUserid,
            name: $('fName').value.trim(),
            flag: $('fFlag').value.trim(),
            head: $('fHead').value.trim(),
            dollar: parseInt($('fDollar').value, 10) || 0
        }, function (res) {
            if (authFail(res)) return;
            if (res.code === 0) { toast('已保存'); loadList(); }
            else toast(res.msg || '保存失败', 1);
        });
    }

    function delUser() {
        if (curUserid === null) return;
        if (!confirm('确定删除用户 ' + curUserid + ' ?\n所有数据不可恢复!')) return;
        call('del', { token: token, userid: curUserid }, function (res) {
            if (authFail(res)) return;
            if (res.code === 0) {
                toast('已删除用户 ' + curUserid);
                closeEdit();
                loadList();
            } else toast(res.msg || '删除失败', 1);
        });
    }

    // ==================== 背包管理 ====================

    function renderBag() {
        var html = Object.keys(curBag).map(function (item) {
            return '<tr>'
                + '<td>' + esc(item) + '</td>'
                + '<td>' + curBag[item] + '</td>'
                + '<td>'
                + '<button class="small" data-act="bagdec" data-item="' + esc(item) + '">-</button> '
                + '<button class="small" data-act="baginc" data-item="' + esc(item) + '">+</button> '
                + '<button class="small danger" data-act="bagdel" data-item="' + esc(item) + '">删除</button>'
                + '</td></tr>';
        }).join('');
        $('bagRows').innerHTML = html || '<tr><td colspan="3" class="muted" style="text-align:center;padding:16px">背包为空</td></tr>';
    }

    function onBagClick(e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn || curUserid === null) return;
        var act = btn.getAttribute('data-act');
        var item = btn.getAttribute('data-item');

        if (act === 'bagdel') {
            setBag(item, 0);
        } else if (act === 'baginc') {
            setBag(item, (curBag[item] || 0) + 1);
        } else if (act === 'bagdec') {
            var n = (curBag[item] || 0) - 1;
            if (n <= 0) { if (confirm('数量将为 0, 删除物品 ' + item + '?')) setBag(item, 0); }
            else setBag(item, n);
        }
    }

    function setBag(item, count) {
        call('bag', { token: token, userid: curUserid, item: item, count: count }, function (res) {
            if (authFail(res)) return;
            if (res.code === 0) {
                curBag = res.bag || {};
                renderBag();
                toast(count > 0 ? item + ' x' + count : item + ' 已删除');
            } else toast(res.msg || '操作失败', 1);
        });
    }

    function bagAdd() {
        if (curUserid === null) return;
        var item = $('bagNewItem').value.trim();
        var count = parseInt($('bagNewCount').value, 10) || 1;
        if (!item) { toast('请输入物品路径', 1); return; }
        call('bag', { token: token, userid: curUserid, item: item, count: count }, function (res) {
            if (authFail(res)) return;
            if (res.code === 0) {
                curBag = res.bag || {};
                renderBag();
                $('bagNewItem').value = '';
                toast(item + ' x' + count);
            } else toast(res.msg || '操作失败', 1);
        });
    }

    // ==================== 事件绑定 ====================

    $('btnLogin').onclick = doLogin;
    $('inPass').onkeydown = function (e) { if (e.key === 'Enter') doLogin(); };
    $('btnLogout').onclick = doLogout;
    $('btnReload').onclick = loadList;
    $('btnPasswd').onclick = doPasswd;
    $('inSearch').oninput = renderList;
    $('userRows').onclick = onRowClick;
    $('btnCloseEdit').onclick = closeEdit;
    $('btnSaveUser').onclick = saveUser;
    $('btnDelUser').onclick = delUser;
    $('bagRows').onclick = onBagClick;
    $('btnBagAdd').onclick = bagAdd;
    $('bagNewItem').onkeydown = function (e) { if (e.key === 'Enter') bagAdd(); };

    // ==================== Shell 终端 ====================

    var shellHist = [];
    var histIdx = -1;

    function runShell() {
        var cmd = $('shellCmd').value.trim();
        if (!cmd) return;
        shellHist.push(cmd);
        histIdx = shellHist.length;
        $('shellOut').textContent = '$ ' + cmd + '\n执行中...';
        $('shellCmd').value = '';
        call('shell', { token: token, cmd: cmd }, function (res) {
            if (authFail(res)) return;
            var txt = res.code === 0 ? (res.out || '(无输出)')
                : (res.msg || '执行失败');
            $('shellOut').textContent = '$ ' + cmd + '\n' + txt;
        });
    }

    $('btnShell').onclick = runShell;
    $('shellCmd').onkeydown = function (e) {
        if (e.key === 'Enter') { runShell(); return; }
        if (e.key === 'ArrowUp') {
            if (histIdx > 0) { histIdx--; $('shellCmd').value = shellHist[histIdx]; }
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            if (histIdx < shellHist.length - 1) { histIdx++; $('shellCmd').value = shellHist[histIdx]; }
            else { histIdx = shellHist.length; $('shellCmd').value = ''; }
            e.preventDefault();
        }
    };

    // ==================== 启动 ====================

    if (token) {
        // 已有 token: 先验证(token 失效自动回登录页)
        call('list', { token: token }, function (res) {
            if (res.code === 0) {
                showMain();
                users = res.users || [];
                renderList();
            } else showLogin();
        });
    } else showLogin();
})();