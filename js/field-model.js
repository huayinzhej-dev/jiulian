// ============================================================
// 外勤模块数据模型 —— field.html（手机端）和 admin.html（PC 后台）共用
// 两边都从这里取集合名、字典默认值和归属人，避免同一字段两种写法。
// 这里的 DM / Sync 由宿主页面提供，本文件只在函数里引用，加载顺序无所谓。
// ============================================================

// 五个新集合。⚠️ 一律不得加进 supabase/schema.sql 的 anon 只读白名单：
// 里面是客户名录和门头照片，前台官网一个字段都不读，多放一个就是全库泄露。
var FIELD_COLS = ['field_trips', 'field_checkins', 'field_customers', 'field_followups', 'field_dicts'];

// 打卡明细单独一张表，不塞进 field_trips 的数组里：
// PC 后台的「拜访打卡记录」要按行筛选导出，而 admin.html 的 exportCSV 会主动丢掉数组字段。
// 跟单 field_followups 同理，不挂在客户的 followUps 数组上。

var FIELD_DICT_KINDS = [
  { kind: 'visit_type', label: '拜访类型' },
  { kind: 'area',       label: '拜访区域' },
  { kind: 'transport',  label: '出行方式' },
  { kind: 'level',      label: '客户意向等级' },
  { kind: 'method',     label: '跟进方式' }
];

// 首次启动且云端为空时的默认选项。区域按公司所在地（柔佛巴西古丹）给的常见跑动范围，
// 主管能在后台「外勤管理 → 基础配置」里改，改完整公司共享同一份。
var FIELD_DICT_SEED = [
  { kind: 'visit_type', name: '预约拜访', sort: 2 },

  { kind: 'area', name: '柔佛·巴西古丹', sort: 1 },
  { kind: 'area', name: '柔佛·新山',     sort: 2 },
  { kind: 'area', name: '柔佛·居銮',     sort: 3 },
  { kind: 'area', name: '柔佛·麻坡',     sort: 4 },
  { kind: 'area', name: '雪兰莪·巴生',   sort: 5 },
  { kind: 'area', name: '吉隆坡',        sort: 6 },
  { kind: 'area', name: '槟城',          sort: 7 },
  { kind: 'area', name: '马六甲',        sort: 8 },
  { kind: 'area', name: '其他',          sort: 99 },

  { kind: 'transport', name: '公司车',   sort: 1 },
  { kind: 'transport', name: '私家车',   sort: 2 },
  { kind: 'transport', name: '摩托车',   sort: 3 },
  { kind: 'transport', name: '公共交通', sort: 4 },
  { kind: 'transport', name: '客户接送', sort: 5 },

  { kind: 'level', name: 'A 明确意向',   sort: 1 },
  { kind: 'level', name: 'B 有意向待跟', sort: 2 },
  { kind: 'level', name: 'C 观望',       sort: 3 },
  { kind: 'level', name: 'D 暂无意向',   sort: 4 },
  { kind: 'level', name: 'E 无效',       sort: 5 },

  { kind: 'method', name: '上门',       sort: 1 },
  { kind: 'method', name: '电话',       sort: 2 },
  { kind: 'method', name: 'WhatsApp',   sort: 3 },
  { kind: 'method', name: '微信',       sort: 4 },
  { kind: 'method', name: '邮件',       sort: 5 },
  { kind: 'method', name: '视频',       sort: 6 }
];

function fieldDictKey(id) { return 'jl_field_dicts' }

// 读某一类字典。云端没拉到时退回内置种子，保证手机端下拉框不会整列空白
// （外勤现场网络差，拿不到字典也得能提交报备）。
// 直接读 jl_field_dicts：admin.html 的 DM 和 field.html 的 LS 用的是同一个键名前缀，
// 主管在后台「外勤管理 → 基础配置」改完整公司共享这一份；要是只认 DM，手机端就永远读种子。
function fieldDicts(kind) {
  var all = [];
  try { all = JSON.parse(localStorage.getItem('jl_field_dicts')) || [] } catch (e) { all = [] }
  if (!Array.isArray(all)) all = [];
  var rows = all.filter(function (d) { return d && d.kind === kind && d.active !== false });
  if (!rows.length) {
    rows = FIELD_DICT_SEED.filter(function (d) { return d.kind === kind })
      .map(function (d, i) { return { id: 'seed-' + kind + '-' + i, kind: kind, name: d.name, sort: d.sort, active: true } });
  }
  return rows.sort(function (a, b) { return (Number(a.sort) || 0) - (Number(b.sort) || 0) });
}

// 字典名列表，给下拉框用；kind 不存在字典表的老数据时退回传入的兜底数组。
function fieldDictNames(kind, fallback) {
  var rows = fieldDicts(kind);
  var names = rows.map(function (d) { return d.name });
  return names.length ? names : (fallback || []);
}

// ---------- 归属人 ----------
// ownerId 存 Supabase Auth 的用户 id，RLS 策略按它判断「销售只看自己的」；
// ownerName 只是列表上显示用，别拿它当权限依据（名字可以重复，也能被前端乱填）。
function fieldOwner() {
  try {
    if (typeof Sync !== 'undefined' && Sync.user && Sync.user.id) {
      return { id: String(Sync.user.id), name: (Sync.user.user_metadata && Sync.user.user_metadata.name) || Sync.user.email || '同事' };
    }
  } catch (e) {}
  try {
    var u = JSON.parse(localStorage.getItem('jiulian_field_user') || localStorage.getItem('jiulian_admin_user') || 'null');
    if (u && u.id) return { id: String(u.id), name: u.name || u.email || '同事' };
    if (u && u.name) return { id: 'local', name: String(u.name).replace(/@.*$/, '') };
  } catch (e) {}
  return { id: '', name: '' };
}

// ---------- 小工具 ----------
// 一律用设备本地时间：档①防作弊记的就是「销售手机上显示的那一刻」，
// 用 toISOString 会把马来西亚/中国的 18:09 存成 10:09，主管看台账时会以为人还没出门。
function fieldNow() {
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n };
  return fieldToday() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function fieldToday() {
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function fieldId(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// 门头照上传前压一遍：手机原图 4–8MB，外勤一天十几张既费流量又慢。
// 只用于打卡照片这类展示图，长边 1280 足够看清招牌。
function fieldCompressImage(file, maxEdge) {
  var edge = maxEdge || 1280;
  return new Promise(function (resolve, reject) {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('请选择照片')); return }
    var url = URL.createObjectURL(file);
    var im = new Image();
    im.onload = function () {
      URL.revokeObjectURL(url);
      var scale = Math.min(1, edge / Math.max(im.naturalWidth, im.naturalHeight));
      var w = Math.max(1, Math.round(im.naturalWidth * scale));
      var h = Math.max(1, Math.round(im.naturalHeight * scale));
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var cx = cv.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
      cx.drawImage(im, 0, 0, w, h);
      cv.toBlob(function (blob) {
        if (!blob) { reject(new Error('图片压缩失败')); return }
        resolve({ blob: blob, name: (file.name || 'photo').replace(/\.[^.]+$/, '') + '-s.jpg', width: w, height: h });
      }, 'image/jpeg', 0.82);
    };
    im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('这张图片读不出来')) };
    im.src = url;
  });
}
