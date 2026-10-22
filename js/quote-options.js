// 报价口径：材质（8 种纸）+ 各自的克重/瓦楞档、印刷色数（10 项）、表面处理（10 项，可多选）。
// 来源是工厂那份「立即获取免费报价」Excel 的纸张表 + 工艺表（工艺表里没有「开窗」，开窗是前台后加的透明窗选项）。
// 前台 index.html 的报价表单、后台 admin.html 的新建报价和线索编辑都读这一份，改这里两边一起变。
// 存进数据的值一律用中文（灰底白 / 300克 / 4C+0C / 单面上光, 开窗），跟客户从前台提交上来的字段是同一套字符串。
window.JL_QUOTE_OPTIONS = {
  // unit 决定档位怎么读：克 = 纸张克重，瓦 = 瓦楞型号（瓦楞纸没有克重这个说法）
  papers: [
    { name: '白卡',     unit: '克', spec: ['250', '300', '350', '400', '450', '500', '600', '700', '800'] },
    { name: '白底白',   unit: '克', spec: ['250', '300', '350', '400', '450', '500', '600', '700', '800'] },
    { name: '灰底白',   unit: '克', spec: ['250', '300', '350', '400', '450', '500', '600', '700', '800'] },
    { name: '铜板纸',   unit: '克', spec: ['105', '128', '157', '200', '250', '300', '350'] },
    { name: '白牛皮纸', unit: '克', spec: ['120', '150', '180', '200', '250', '300'] },
    { name: '黄牛皮纸', unit: '克', spec: ['120', '150', '180', '200', '250', '300'] },
    { name: '三层瓦楞', unit: '瓦', spec: ['A', 'B', 'C', 'E'] },
    { name: '五层瓦楞', unit: '瓦', spec: ['BC', 'BA', 'BE'] }
  ],
  printing: ['纯色/无印刷', '1C+0C', '1C+1C', '4C+0C', '4C+1C', '4C+4C', '5C+0C', '5C+1C', '5C+4C', '5C+5C'],
  finishing: ['哑光覆膜', '亮光覆膜', '单面上光', '双面上光', '单面吸塑油', '双面吸塑油', '局部UV', '压花', '烫金', '开窗'],

  paperOf: function (name) {
    for (let i = 0; i < this.papers.length; i++) if (this.papers[i].name === name) return this.papers[i];
    return null;
  },

  // 选好材质后跟着筛出来的档位（带单位）；材质没定时返回空数组，由调用方决定铺哪些
  gsmValues: function (name) {
    const p = this.paperOf(name);
    return p ? p.spec.map(v => v + p.unit) : [];
  },

  // 某一类（'克' 或 '瓦'）的全部档位，去重。克重按数字从小到大，瓦楞按纸种出现顺序
  specsOf: function (unit) {
    const out = [];
    this.papers.forEach(p => {
      if (p.unit !== unit) return;
      p.spec.forEach(v => { if (out.indexOf(v) < 0) out.push(v) });
    });
    return unit === '克' ? out.sort((a, b) => Number(a) - Number(b)) : out;
  }
};
