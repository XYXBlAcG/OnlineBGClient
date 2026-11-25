import { z } from "zod";

export const fayuPosSchema = z.enum(["noun", "proper", "place", "verb", "adj", "adv"]);
export type FayuPos = z.infer<typeof fayuPosSchema>;

export const fayuNounClasses = [
  "person",
  "animal",
  "plant",
  "food",
  "object",
  "vehicle",
  "nature",
  "building",
  "body",
] as const;
export type FayuNounClass = (typeof fayuNounClasses)[number];

export const fayuNounClassNames: Record<FayuNounClass, string> = {
  person: "人物",
  animal: "动物",
  plant: "植物",
  food: "食物",
  object: "物品",
  vehicle: "交通工具",
  nature: "自然现象",
  building: "建筑",
  body: "身体部位",
};

export const fayuWordSchema = z.object({
  word: z.string().trim().min(1).max(20),
  pos: fayuPosSchema,
  aliases: z.array(z.string().trim().min(1).max(20)).max(3).default([]),
  classes: z.array(z.enum(fayuNounClasses)).max(4).optional(),
  agents: z.array(z.enum(fayuNounClasses)).max(9).optional(),
  patients: z.array(z.enum(fayuNounClasses)).max(9).optional(),
  targets: z.array(z.enum(fayuNounClasses)).max(9).optional(),
  transitive: z.boolean().optional(),
  absurd: z.boolean().optional(),
  category: z.string().trim().max(12).default(""),
});
export type FayuWord = z.infer<typeof fayuWordSchema>;
export interface FayuPool {
  words: FayuWord[];
}

const nouns: Record<FayuNounClass, readonly string[]> = {
  person: [
    "小丑","厨师","快递员","程序员","主播","保安","幼儿园小朋友","老奶奶","外卖小哥","健身教练",
    "广场舞大妈","社畜","熊孩子","芭蕾舞者","魔术师","摄影师","面包师","出租车司机","实习生","理发师",
    "语文老师","实习生","主持人","收银员","理发店老板","零食测评博主","地铁站务员","奶茶店员",
  ],
  animal: [
    "长颈鹿","蜗牛","企鹅","章鱼","河马","水母","斑马","金鱼","海星","猫咪",
    "柴犬","兔子","熊猫","老虎","鲸鱼","海豚","猫头鹰","刺猬","袋鼠","独角兽",
    "螃蟹","壁虎","树懒","浣熊","鹦鹉","松鼠","蜜蜂","蝴蝶","蜻蜓","小鸡",
    "绿头鸭","柯基","橘猫","仓鼠","羊驼","孔雀","大熊猫","企鹅宝宝","章鱼哥","海獭",
  ],
  plant: [
    "仙人掌","向日葵","蘑菇","南瓜","胡萝卜","玉米","榴莲","香菜","折耳根","苦瓜",
    "柠檬","含羞草","竹子","玫瑰","蒲公英","苔藓","仙人球","绿萝","芦苇","芭蕉",
    "榴莲树","西瓜藤","番茄","辣椒","大蒜","洋葱","土豆","韭菜","爬山虎","水草",
  ],
  food: [
    "西瓜","冰淇淋","蛋糕","草莓","菠萝","汉堡","寿司","棉花糖","辣条","螺蛳粉",
    "皮蛋","跳跳糖","奶茶","火锅","烧烤","煎饼果子","章鱼小丸子","鲱鱼罐头","榴莲披萨","爆米花",
    "臭豆腐","泡面","汤圆","饺子","甜甜圈","珍珠奶茶","螺蛳粉汤","焦糖布丁","麻辣烫","炸鸡",
    "关东煮","烤冷面","豆浆油条","菠萝包","榴莲酥","辣火锅","冰美式","热可可","棒棒糖","芥末",
  ],
  object: [
    "闹钟","沙发","牙刷","冰箱","滑板","望远镜","电风扇","跷跷板","纸飞机","帐篷",
    "口琴","放大镜","背包","茶壶","秋千","指南针","雨伞","陀螺","温度计","蜘蛛网",
    "雨靴","风铃","气球","邮筒","扫帚","水晶球","沙漏","羽毛","镜子","拖鞋",
    "钢琴","吉他","小提琴","鼓","麦克风","相机","地球仪","台灯","篮球","足球",
    "滑梯","泡泡","臭袜子","假发","假牙","马桶","马桶搋子","吸尘器","微波炉","洗衣机",
    "空气炸锅","扫地机器人","保温杯","筋膜枪","自拍杆","充电宝","自动售货机","消防栓","停车罚单","作业本",
    "PPT","投影仪","广场舞音响","泡脚桶","指甲刀","假睫毛","领带","头盔","护目镜","拳击手套",
    "呼啦圈","毽子","沙包","橡皮鸭","尖叫鸡","解压捏捏乐","盲盒","手办","毛绒玩具","抱枕",
    "地毯","窗帘","吊灯","电饭煲","平底锅","锅铲","打蛋器","擀面杖","案板","垃圾桶",
    "拖把","鸡毛掸子","晾衣架","快递箱","外卖袋","购物车","地铁票","停车卡","工牌","体检报告",
    "账单","彩票","房产证","假蟑螂","马桶刷","金牙","时光机","竹蜻蜓","蝴蝶结变声器","魔法棒",
    "水手服","精灵球","宝可梦图鉴","铁臂","双马尾","草帽","日轮刀","立体机动装置","斩魄刀","领域展开",
  ],
  vehicle: [
    "热气球","潜水艇","皮划艇","火车","校车","飞船","共享单车","摩天轮","地铁","雪橇",
    "滑板车","拖拉机","小型飞机","碰碰车","观光车","独轮车","三轮车","纸船",
  ],
  nature: [
    "月亮","火山","龙卷风","雪人","太阳","彩虹","台风","流星","海啸","闪电",
    "露水","晚霞","极光","沙尘暴","流星雨","云朵","雾气","雨滴","雪花","冰块",
  ],
  building: [
    "灯塔","城堡","桥","喷泉","电话亭","天桥","售楼处","加油站","地铁站","加油站顶棚",
    "自动洗车房","公共厕所","体育馆","摩天轮底座","旋转门","玻璃房",
  ],
  body: [
    "眉毛","睫毛","肚脐眼","后脑勺","脚趾头","胳肢窝","双下巴","嗓子","膝盖","小拇指",
    "眼袋","发际线","半边脸","后槽牙","脚后跟",
  ],
};

const proper = [
  "皮卡丘","哆啦A梦","龙猫","猫巴士","无脸男","柯南","樱木花道","流川枫","月野兔","初音未来",
  "初号机","使徒","高达","扎古","奥特曼","怪兽","假面骑士","超级赛亚人","乔巴","路飞",
  "炭治郎","祢豆子","五条悟","乌野","调查兵团","阿童木","宝可梦","千与千寻","汤屋","鬼灭之刃",
  "哈利波特","伏地魔","马里奥","林克","塞尔达","索尼克","海绵宝宝","派大星","变形金刚","钢铁侠",
  "蜘蛛侠","圣诞老人","嫦娥","孙悟空","哪吒","猪八戒","唐僧","白雪公主","灰姑娘","美人鱼",
  "小王子","雷切","螺旋丸","龟派气功","日轮刀","起爆符",
] as const;

const places = [
  "森林","厨房","月球","地铁站","海底","操场","冰箱","教室","图书馆","火车站",
  "游乐园","沙漠","雪山","海边","花园","屋顶","浴室","超市","电影院","太空",
  "火山口","云朵","树洞","城堡","电梯","浴缸","鞋盒","博物馆","加油站","菜市场",
  "火锅店","奶茶店","公司会议室","停车场","直播间","演唱会现场","超市冷柜","洗衣机","马桶","天台",
  "地铁车厢","摩天轮","共享单车","快递箱","被窝","衣柜","办公桌","垃圾桶","广场舞现场","银行柜台",
  "医院走廊","理发店","考场","电梯井","回收站","冰箱冷冻层","自助餐厅","健身房","KTV包厢","售楼处",
  "婚礼现场","幼儿园","鬼屋","体育馆","天桥","电话亭",
] as const;

const adjectiveGroups: { targets: FayuNounClass[] | "any"; words: readonly string[] }[] = [
  { targets: ["animal"], words: ["毛茸茸","打瞌睡","刚睡醒","爱舔人","掉毛","圆滚滚","爱拆家"] },
  { targets: ["plant"], words: ["长满青苔","会开花","蔫巴巴","刚发芽","叶子发黄","爱晒太阳"] },
  { targets: ["food"], words: ["香喷喷","滚烫","冰凉","黏糊糊","过期","加了双倍芝士","甜到发齁","辣得冒烟"] },
  { targets: ["object"], words: ["透明","发光","皱巴巴","方方正正","湿漉漉","二手","会响","掉了漆","超大号"] },
  { targets: ["vehicle"], words: ["四驱","会漂移","漏气","贴着贴纸","超载"] },
  { targets: ["nature"], words: ["闪电般","咆哮着","半透明","正在爆炸"] },
  { targets: ["building"], words: ["长满爬山虎","歪斜","正在装修","灯光全亮"] },
  { targets: ["body"], words: ["发红","被门夹过","贴了创可贴","沾了酱汁"] },
  { targets: ["person","animal"], words: ["伤心","安静","吵闹","社恐","跑调","打嗝","戴帽子","穿西装","戴假发","戴眼镜","穿裙子","会说话","会唱歌","会翻白眼","脚底打滑","气鼓鼓","得意洋洋","刚睡醒","爱加班","爱炫饭"] },
  { targets: "any", words: ["巨大","迷你","彩虹色","会飞","会隐身","会喷火","旋转","倒立","倒着走","能装下一个人","会跳广场舞","长了腿","长了翅膀","会唱rap","正在融化","软绵绵","硬邦邦","亮晶晶"] },
];

const verbGroups: {
  agents: FayuNounClass[];
  patients?: FayuNounClass[];
  words: readonly string[];
}[] = [
  {
    agents: ["person", "animal"],
    words: [
      "跳舞","唱歌","打喷嚏","发呆","散步","翻跟头","打滚","笑","哭","睡觉","刷牙","洗脸","跳广场舞","啃指甲",
      "打呼噜","说梦话","翻白眼","抠脚","蹦迪","唱K","跳皮筋","踢毽子","打太极","练瑜伽","滑跪","假笑","狂笑",
      "装死","发疯","社死","摆烂","摸鱼","加班","排队","等公交","吹泡泡","跳房子","跳踢踏舞","唱rap","翻跟斗",
      "点外卖","刷短视频","跳科目三","抢红包","点奶茶","吃火锅","洗碗","做饭","扫地","看报纸","弹钢琴","打鼓",
      "拍照","打电话","开飞机","敲键盘","修水管","开锁","倒垃圾","催更","吹牛","抢座位","抢厕所","撸猫","遛狗",
      "浇花","打包","端菜","洗脸","擦桌子","照镜子","吹口哨","跺脚",
    ],
  },
  {
    agents: ["person", "animal", "object"],
    words: ["跑", "走", "跳", "爬", "飞", "游", "滑行", "漂浮"],
  },
  {
    agents: ["person", "animal"],
    patients: ["food", "object"],
    words: ["吃", "喝", "啃", "闻", "摸", "叼", "尝", "咬", "偷吃"],
  },
  {
    agents: ["person", "animal"],
    patients: ["object", "food", "person", "animal"],
    words: ["推", "拉", "扔", "抱", "画", "按", "拖"],
  },
  {
    agents: ["person", "animal"],
    patients: ["person", "animal", "object"],
    words: ["拥抱", "追赶", "踢", "找到", "等", "教"],
  },
];

const adverbs = [
  "慢慢","突然","悄悄","疯狂","开心","伤心","认真","随便","偷偷","大声",
  "安静","飞快","笨拙","优雅","迷迷糊糊","高高兴兴","气呼呼","懒洋洋","小心翼翼","慌慌张张",
  "理直气壮","鬼鬼祟祟","手忙脚乱","一本正经","得意洋洋","气急败坏","含情脉脉","大摇大摆","偷偷摸摸","连滚带爬",
  "东张西望","漫不经心","心不在焉","趾高气扬","贼眉鼠眼","摇头晃脑","张牙舞爪","生无可恋","若无其事","兴高采烈",
] as const;

const absurdWords = new Set([
  "假发","臭袜子","马桶搋子","筋膜枪","PPT","作业本","账单","房产证","鲱鱼罐头","皮蛋",
  "折耳根","尖叫鸡","解压捏捏乐","盲盒","手办","广场舞音响","泡脚桶","双下巴","胳肢窝","后脑勺",
  "会说话","长了腿","会跳广场舞","正在融化","被门夹过","喜欢加班","会喷火","香得离谱","臭得惊人",
  "跳广场舞","刷短视频","抢红包","发疯","社死","摸鱼","摆烂","抠脚","翻白眼","跳皮筋",
  "鬼鬼祟祟","连滚带爬","贼眉鼠眼","张牙舞爪","生无可恋","摇头晃脑","跳科目三","吃火锅",
]);

const builtin: FayuWord[] = [
  ...fayuNounClasses.flatMap((nounClass) =>
    nouns[nounClass].map((word) => ({
      word,
      pos: "noun" as const,
      aliases: [],
      classes: [nounClass],
      absurd: absurdWords.has(word),
      category: fayuNounClassNames[nounClass],
    })),
  ),
  ...proper.map((word) => ({
    word,
    pos: "proper" as const,
    aliases: [],
    classes: ["person"] as FayuNounClass[],
    absurd: true,
    category: "作品角色",
  })),
  ...places.map((word) => ({
    word,
    pos: "place" as const,
    aliases: [],
    absurd: absurdWords.has(word),
    category: "地点",
  })),
  ...adjectiveGroups.flatMap((group) =>
    group.words.map((word) => ({
      word,
      pos: "adj" as const,
      aliases: [],
      targets: group.targets === "any" ? undefined : group.targets,
      absurd: absurdWords.has(word),
      category: group.targets === "any" ? "通用形容" : "分类形容",
    })),
  ),
  ...verbGroups.flatMap((group) =>
    group.words.map((word) => ({
      word,
      pos: "verb" as const,
      aliases: [],
      agents: group.agents,
      patients: group.patients ?? [],
      transitive: !!group.patients?.length,
      absurd: absurdWords.has(word),
      category: group.patients?.length ? "及物动作" : "不及物动作",
    })),
  ),
  ...adverbs.map((word) => ({
    word,
    pos: "adv" as const,
    aliases: [],
    absurd: absurdWords.has(word),
    category: "副词",
  })),
];

export const fayuBuiltinWords: FayuWord[] = builtin.filter(
  (word, index) =>
    builtin.findIndex(
      (candidate) => candidate.pos === word.pos && candidate.word === word.word,
    ) === index,
);

export const fayuBuiltinPool: FayuPool = { words: fayuBuiltinWords };

export function fayuPoolByPos(pool: FayuPool, pos: FayuPos) {
  return pool.words.filter((word) => word.pos === pos);
}

export function fayuPoolComplete(pool: FayuPool) {
  const choice = (pos: FayuPos) =>
    fayuPoolByPos(pool, pos).filter((word) => !word.absurd).length;
  return (
    choice("noun") >= 3 &&
    fayuPoolByPos(pool, "place").length >= 1 &&
    fayuPoolByPos(pool, "place").filter((word) => !word.absurd).length >= 1 &&
    choice("adj") >= 2 &&
    choice("adv") >= 2 &&
    fayuPoolByPos(pool, "verb").some((word) => !word.transitive) &&
    choice("verb") >= 2
  );
}

export function fayuNounClassesOf(word: FayuWord): FayuNounClass[] {
  if (word.classes?.length) return word.classes;
  return word.pos === "proper" ? ["person"] : ["object"];
}

export const fayuMotionVerbSet = new Set([
  "跑","走","跳","爬","飞","游","滑行","漂浮","翻跟头","打滚","蹦迪","跳房子","散步",
]);

export function fayuVerbAgents(word: FayuWord): FayuNounClass[] {
  return word.agents?.length ? word.agents : ["person", "animal"];
}

export function fayuVerbPatients(word: FayuWord): FayuNounClass[] {
  return word.patients ?? [];
}

export function fayuAdjectiveTargets(word: FayuWord): FayuNounClass[] | "any" {
  return word.targets?.length ? word.targets : "any";
}

export function fayuCombinedPool(...pools: FayuPool[]): FayuPool {
  return {
    words: pools
      .flatMap((pool) => pool.words)
      .filter(
        (word, index, list) =>
          list.findIndex(
            (candidate) =>
              candidate.pos === word.pos && candidate.word === word.word,
          ) === index,
      ),
  };
}
