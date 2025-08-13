import { InnerMessageChunk } from '@/types';

export const mockData = [
  {
    // 用户消息
    // 消息id
    id: 'chunk_1748438204041_0',
    // 消息类型
    type: 'text',
    // 消息角色
    role: 'user',
    // 用户输入的消息
    content: '中关村附近免费公园',
    config: {
      // 引用的知识库
      knowledgeIds: [1, 2, 3],
      // 引用的MCP、tool、agent等
      tools: [1, 2, 3],
      // 上传的文件
      files: [
        {
          name: '文件1',
          type: 'pdf',
          url: '', // 上传
        },
      ],
    },
    timestamp: 1748438204041,
  },
  {
    // AI消息
    id: 'chunk_1748438204041_1',
    type: 'text',
    role: 'assistant',
    content: '您好！我会帮您查找中关村附近的免费公园信息。请稍等片刻，我将为您收集相关信息。',
    timestamp: 1748438204041,
  },
  {
    // 开始思考
    id: '123123123123123',
    type: 'liveStatus',
    content: '思考中',
    timestamp: 1748438204041,
  },
  {
    // 开始规划
    id: 'liveStatus1',
    type: 'liveStatus',
    content: '规划中',
    timestamp: 1748438204041,
  },
  {
    // 生成规划
    id: 'chunk_1748438204041_3',
    type: 'plan',
    content: 'AI 的规划',
    timestamp: 1748438204041,
    detail: {
      steps: [
        {
          id: 'step1',
          title: '搜索中关村附近的免费公园',
          description: '步骤1的描述',
          status: 'running',
          started_at: 1748438204041,
        },
        {
          id: 'step2',
          title: '验证公园的信息和地理位置',
          description: '步骤2的描述',
          status: 'pending',
          started_at: 1748438204041,
        },
        {
          id: 'step3',
          title: '整理公园的详细信息成文档',
          description: '步骤3的描述',
          status: 'pending',
          started_at: 1748438204041,
        },
        {
          id: 'step4',
          title: '反馈并将文档发送给用户',
          description: '步骤4的描述',
          status: 'pending',
          started_at: 1748438204041,
        },
      ],
    },
  },
  {
    // 第一步里的思考
    id: 'qYOmpYISgzC2ziKnRuTEsY',
    type: 'liveStatus',
    timestamp: 1748438205657,
    content: '思考中',
    step_id: 'step1',
  },
  {
    // 又思考了一次
    id: 'HON4z3RCHU00hvqjyDmxaB',
    type: 'liveStatus',
    timestamp: 1748438205703,
    content: '思考中',
    step_id: 'step1',
  },
  {
    // 还思考
    id: 'KRrgXUoXE9S79Wd0OFohNU',
    type: 'liveStatus',
    timestamp: 1748438207333,
    content: '思考中',
    step_id: 'step1',
  },
  {
    // 输出一行字，开始搜索
    id: 'chunk_1748438204041_5',
    type: 'text',
    content: '开始搜索中关村附近的免费公园信息',
    timestamp: 1748438204041,
    step_id: 'step1',
  },
  {
    // 调用工具，开始搜索
    id: 'chunk_1748438204041_6',
    type: 'tool_call', // 换成里面的 tool 名字
    content: '正在搜索',
    detail: {
      tool: 'search', // 工具类型标识符
      action: '正在搜索',
      param: '中关村附近免费公园',
      status: 'pending', // 状态： 'pending' | 'running' | 'success' | 'error'
    },
    timestamp: 1748438204041,
    step_id: 'step1',
  },
  {
    // 工具调用结果
    id: 'chunk_1748438204041_7',
    type: 'tool_result',
    content: '正在搜索',
    detail: {
      tool: 'search',
      action: '搜索结果',
      param: '中关村附近免费公园',
      result: [
        {
          favicon: 'TODO',
          link: 'https://m.bj.bendibao.com/tour/143161_5.html',
          description:
            '与其他城市公园不同，中关村森林公园以营造“近自然林”为目标，森林面积占全园70%以上，栽植的各类植物有100多种，通过乔灌草搭配，针叶树、阔叶树搭配，不同的 ...',
          title: '北京免费踏青好去处之海淀:唐家岭变身中关村森林公园',
        },
        {
          favicon: 'TODO',
          icon: 'https://fanyi.baidu.com/favicon.ico',
          link: 'https://www.visitbeijing.com.cn/article/48WUPIgkf4s',
          description:
            '画眉山滨水公园体现蓝绿结合的自然景观理念，全线串联慢行系统。湖中种植有荷花、鸢尾、睡莲等水生植物。二十处景观节点，可以满足不同人群日常需求，亲水、散步、休闲、观赏， ...',
          title: '滨水、生态、免费！ 海淀北部又添大型公园 - 北京旅游网',
        },
        {
          favicon: 'TODO',
          icon: 'https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*eco6RrQhxbMAAAAAAAAAAAAADgCCAQ/original',
          link: 'https://zhuanlan.zhihu.com/p/41983280',
          description:
            '柳荫公园坐落于安定门的外馆斜街，公园的标志是常青的柳树，因夏天柳树成荫而得名。逛起来总觉得有穿越的感觉，少无适俗韵，性本爱丘山。 门票价格：免费.',
          title: '在北京必去的18个免费公园，推荐！ - 知乎专栏',
        },
        {
          favicon: 'TODO',
          link: 'https://m.bj.bendibao.com/tour/240734.html',
          description:
            '北京免费公园大全13个免费公园推荐 ; 1、奥林匹克森林公园 ; 乘车路线： ; 2、海淀公园 ; 地址：海淀区新建宫门路2号 ; 交通路线：.',
          title: '北京免费公园大全13个免费公园推荐 - 北京本地宝',
        },
        {
          favicon: 'TODO',
          link: 'https://www.sohu.com/a/272848567_100143624',
          description:
            '中关村森林公园 中关村森林公园位于唐家岭路，自驾前往的朋友，经过一片幽静的小路就来到了公园门口，可以免费停车，而且不收门票。 这里人少、地广、幽静，可 ...',
          title: '北京免费景点大盘点，吃喝玩乐在海淀_公园 - 搜狐',
        },
        {
          favicon: 'TODO',
          link: 'https://s.visitbeijing.com.cn/attraction/120931',
          description:
            '中关村森林公园北临航天城，南接软件园，东依京新高速，是海淀区今年平原地区造林工程的重点建设项目，一期规划面积2940亩，建成后免费向市民开放。 整个公园的建设期历时3年， ...',
          title: '中关村森林公园 - 北京旅游网',
        },
        {
          favicon: 'TODO',
          link: 'https://www.beijing.gov.cn/renwen/sy/whkb/201905/t20190530_1866177.html',
          description:
            '家门口的免费公园，11个景点全开放，. 咱们说的这个公园. 就是位于丰台、海淀、西城交界. 被附近群众当成自家后花园的. 莲花池公园. 速来打卡！家门口的 ...',
          title: '速来打卡！家门口的免费公园，11个景点全开放 - 北京市人民政府',
        },
        {
          favicon: 'TODO',
          link: 'https://hk.trip.com/moments/detail/beijing-1-128796312/',
          description:
            '最美的季節去紫竹院公園，免費景點. 紫竹院公園，位於北京市海淀區中關村南大街35號，因園內西北部有明清時期廟宇「福蔭紫竹院」而得名，總佔地面積為457300 ...',
          title: '最美的季節去紫竹院公園，免費景點｜Trip.com 北京',
        },
        {
          favicon: 'TODO',
          link: 'https://www.sohu.com/a/201115214_161623',
          description:
            '尤其是近几年来，按照市区的规划，在唐家岭村旧址上建起了中关村森林公园，免费为市民开放，公园北邻航天城，南接软件园，东依京新高速。公园就地取材，利用拆迁 ...',
          title: '中关村森林公园城市新风景 - 搜狐',
        },
        {
          favicon: 'TODO',
          link: 'https://baike.baidu.com/item/%E7%B4%AB%E7%AB%B9%E9%99%A2%E5%85%AC%E5%9B%AD/3312060',
          description:
            '紫竹院公园，位于北京市海淀区中关村南大街35号，因园内西北部有明清时期庙宇“福荫紫竹院”而得名，总占地面积为457300平方米。紫竹院公园始建于1953年，2006年7月1日起免费 ...',
          title: '紫竹院公园_百度百科',
        },
        {
          favicon: 'TODO',
          link: 'https://cn.tripadvisor.com/Attraction_Review-g294212-d1793435-Reviews-Haidian_Park-Beijing.html',
          description:
            '海淀公园之所以能得名还得益于坐拥得天独厚的地理位置，公园拥有占地面积40公顷，其中绿化面积就达到30公顷，是一个绿色的生态公园。海淀公园特别为游客开发的10处景观都是 ...',
          title: '海淀公园(北京市) - 旅游景点点评 - Tripadvisor',
        },
        {
          favicon: 'TODO',
          link: 'https://www.beijing.gov.cn/renwen/jrbj/csjz/201908/t20190815_1874388.html',
          description:
            '在北京南二环边上，有这么一座公园…… 北京市第一座以老年活动为中心的主题公园. 这个公园，就是万寿公园. 万寿公园原址是明代建立的关帝庙.',
          title: '这个二环内的免费公园，最适合老人养生！ - 北京市人民政府',
        },
        {
          favicon: 'TODO',
          link: 'https://zhidao.baidu.com/question/11033050?bd_page_type=0&pu=&init=',
          description:
            '是北京大学的标志景观之一。奥林匹克公园：北京奥林匹克公园位于北京市朝阳区，地处北京城中轴线北端，北至清河南岸，南至北土城路，东至安立路和北辰东路，西至林翠路和北辰西路 ...',
          title: '中关村附近有什么免费的公园吗？ - 百度知道',
        },
        {
          favicon: 'TODO',
          link: 'https://pkugv.pku.edu.cn/shzn/zbjd/index.htm',
          description:
            '... 本人老年优待证游览公园免收门票费(不含园中园，大型活动期间除外)，残疾人免收门票。 地址：北京市海淀区清华西路28号. 交通路线：乘特4、运通105、运通205、365、432 ...',
          title: '生活指南 - 北京大学中关新园',
        },
        {
          favicon: 'TODO',
          link: 'https://hk.trip.com/moments/detail/beijing-1-130713360/',
          description:
            '景點特色：免費公園，好多人跳舞 ，景色好靚。 ... 其他tips： 紫竹院公園，位於北京市海淀區中關村南大街35 號，因公園西北部有明清時期嘅廟宇「福蔭紫竹院」而 ...',
          title: '北京免費郊遊賞春公園 - Trip.com',
        },
        {
          favicon: 'TODO',
          link: 'https://cn.tripadvisor.com/AttractionsNear-g294212-d1793435-Haidian_Park-Beijing.html',
          description:
            '海淀公园. 4.3. (36 条点评). 100080 中国北京市海淀区西北四环万泉河立交桥的西北角 ; 海淀展览馆. 5.0. (1 条点评). 100080 中国北京市海淀区新建宫门路2号 ; 北京大学.',
          title: '海淀公园附近的10 大景点玩乐 - Tripadvisor',
        },
        {
          favicon: 'TODO',
          link: 'https://www.expedia.com/cn/Beijing-Zhongguancun.dx6160223',
          description:
            '热门景点 ; 王府井大街. 4.5/5(9 条点评) ; 中国长城 ; 紫禁城(故宫). 4/5(15 条点评) ; 天安门广场. 5/5(9 条点评) ; 三里屯路. 5/5(2 条点评).',
          title: '前往中关村：中关村北京之旅精选2025 | Expedia 旅行',
        },
        {
          favicon: 'TODO',
          link: 'https://bj.zu.anjuke.com/fangyuan/4080379961826316',
          description:
            '位于海淀区中关村大街。属于双榆树商圈，满足日常购物需求。附近有多个公园和文化广场，如知春公园（288米）、双榆树公园（451米）、金五星体育公园 ...',
          title: '双榆树北路中关村医院知春公园双榆树公园3号线 - 北京租房',
        },
        {
          favicon: 'TODO',
          link: 'https://www.douyin.com/search/%E4%B8%AD%E5%85%B3%E6%9D%91%E5%85%AC%E5%9B%AD%E5%8D%97%E9%97%A8%E5%81%9C%E8%BD%A6%E5%9C%BA%E5%85%8D%E8%B4%B9',
          description:
            '推荐一个人少景美的免费公园。北京中关村森林公园24小时开放|免费PI北门南门东门免费停车公园怎么玩? 公园分东西两区，东区更大更好玩，导航中关村森林 ...',
          title: '中关村公园南门停车场免费 - 抖音',
        },
        {
          favicon: 'TODO',
          link: 'https://www.booking.com/landmark/cn/fragrant-hills-park.zh-cn.html',
          description:
            '北京中关村科技园智选假日酒店l紧邻圆明园&北京体育大学&农业大学l打车10分钟到颐和园&北大清华l高铁20分钟到八达岭长城位于北京，距离颐和园有不到6.9公里，提供快速办理 ...',
          title: '北京香山公园附近的酒店',
        },
      ],
      status: 'success',
    },
    timestamp: 1748438204041,
    step_id: 'step1',
  },
  {
    // 输出一行字，准备核查和整理详细信息
    id: 'gdlOAbH1qqb9KLnrDMD1kZ',
    type: 'text',
    content: '已获得中关村附近免费公园的搜索结果，准备核查和整理详细信息',
    timestamp: 1748438207348,
    step_id: 'step1',
  },
  {
    // 更新计划
    id: 'chunk_1748438204041_8',
    type: 'plan_update',
    content: '计划更新说明',
    detail: {
      action: 'update', // add/update/remove
      steps: [
        {
          id: 'step1',
          title: '搜索中关村附近的免费公园',
          description: '步骤1的描述',
          // 第一条完成了
          status: 'success',
          started_at: 1748438204041,
        },
        {
          id: 'step2',
          title: '验证公园的信息和地理位置',
          description: '步骤2的描述',
          // 第二条开始执行
          status: 'running',
          started_at: 1748438204041,
        },
      ],
    },
    timestamp: 1748438204041,
  },
  {
    // 第二步里的思考
    id: 'liveStatus3',
    type: 'liveStatus',
    content: 'AI 正在思考',
    timestamp: 1748438204041,
    step_id: 'step2',
  },
  {
    // 第二步里的准备动作
    id: 'MeTsHrtrM9OcQeU7t9PnlU',
    type: 'liveStatus',
    timestamp: 1748438209327,
    content: '使用浏览器',
    step_id: 'step2',
  },
  {
    // 第二步里的准备动作
    id: 'BpatldBko31ESGqtivbVkj',
    type: 'liveStatus',
    timestamp: 1748438209327,
    content: '正在初始化计算机',
    step_id: 'step2',
  },
  {
    // 调用工具，使用浏览器
    id: 'chunk_1748438204041_10',
    type: 'tool_call',
    content: '正在使用浏览器',
    detail: {
      tool: 'browser',
      action: '正在使用浏览器',
      param: 'https://m.bj.bendibao.com/tour/143161_5.html',
      status: 'pending',
    },
    step_id: 'step2',
  },
  {
    id: 'pNDaNYPYx2itFGImtBdxHD',
    type: 'tool_result',
    content: '正在使用浏览器',
    detail: {
      tool: 'browser',
      action: '正在使用浏览器',
      param: 'https://m.bj.bendibao.com/tour/143161_5.html',
      result: {
        screenshot:
          'https://private-us-east-1.manuscdn.com/sessionFile/oV9UIfnPVi2PtZ898arEIb/browserScreenshots/AkmYSi70dsPdOmLDWqAITc_1748438209774_na1fn_Y2xlYW4.webp?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvb1Y5VUlmblBWaTJQdFo4OThhckVJYi9icm93c2VyU2NyZWVuc2hvdHMvQWttWVNpNzBkc1BkT21MRFdxQUlUY18xNzQ4NDM4MjA5Nzc0X25hMWZuX1kyeGxZVzQud2VicCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc2NzIyNTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=pMCvDvwValxGbdTeENhnSoRJr5eXPnpdsS36lbdTAq7n-g0X-Z8~wXNoNNCtD-0sxxlyW7Cmu5P2yjvHc5k2dLM-edOL3dMs5Ul5DNOzTLjHjFBjRIFFCswCSXPiUXuo2-M6QcU7ayJYKt6QgiInQI5J2ngvKj9mdI99KIVTMbAb6yMZgcU2gLmEgLcySTeU9k6WPK6OuwCHacEAzuqByIBA93RpuOkIqzi-TeMnXxHO46zLhhdtuin54X~SsCoXsvP1p1OiuvGvt1lyTfVMJ9-F3YD69975RqlNI3y5hMtFmQeFMFb~9XT2d-hy39oA20CZQXpOueq~5Y3AUmaF1w__',
      },
      status: 'success',
    },
    step_id: 'step2',
  },
  {
    id: 'zlyFOkxYLOzRRLCeF6nrKu',
    type: 'liveStatus',
    timestamp: 1748438216803,
    content: '查看浏览器',
    step_id: 'step2',
  },
  {
    id: '4u2ZCA057YPQHLE2eWbgwH',
    type: 'liveStatus',
    timestamp: 1750073433215,
    content: '使用终端',
    step_id: 'step2',
  },
  {
    // 调用工具，使用浏览器
    id: 'azRKKVXFICJYVceLBKFrGu',
    type: 'tool_call',
    content: '正在使用终端',
    detail: {
      tool: 'terminal',
      action: '正在执行命令',
      param:
        "python3 -c \"\nimport re\n\ndef ansi_to_html(ansi_string):\n    html_string = ansi_string\n    # Green color\n    html_string = re.sub(r'\\u001b\\[32m', '<span style=\\\"color: green;\\\">', html_string)\n    # Reset color\n    html_string = re.sub(r'\\u001b\\[0m', '</span>', html_string)\n    # Replace newlines with <br>\n    html_string = html_string.replace('\\n', '<br>')\n    return html_string\n\nansi_input = \\\"\\u001b[32mubuntu@sandbox:~ $\\u001b[0m cd /home/ubuntu && mkdir -p chartmetric_analysis && cd chartmetric_analysis && mkdir -p data\\n\\n\\u001b[32mubuntu@sandbox:~/chartmetric_analysis $\\u001b[0m\\\"\nhtml_output = ansi_to_html(ansi_input)\n\nwith open('output.html_content', 'w') as f:\n    f.write(html_output)\n\nprint(html_output)\n\"",
      status: 'pending',
    },
    step_id: 'step2',
  },
  {
    id: '6VdmLj9imJKUfZF60FEBGK',
    type: 'tool_result',
    content: '正在使用终端',
    detail: {
      tool: 'terminal',
      action: '正在执行命令',
      param:
        "python3 -c \"\nimport re\n\ndef ansi_to_html(ansi_string):\n    html_string = ansi_string\n    # Green color\n    html_string = re.sub(r'\\u001b\\[32m', '<span style=\\\"color: green;\\\">', html_string)\n    # Reset color\n    html_string = re.sub(r'\\u001b\\[0m', '</span>', html_string)\n    # Replace newlines with <br>\n    html_string = html_string.replace('\\n', '<br>')\n    return html_string\n\nansi_input = \\\"\\u001b[32mubuntu@sandbox:~ $\\u001b[0m cd /home/ubuntu && mkdir -p chartmetric_analysis && cd chartmetric_analysis && mkdir -p data\\n\\n\\u001b[32mubuntu@sandbox:~/chartmetric_analysis $\\u001b[0m\\\"\nhtml_output = ansi_to_html(ansi_input)\n\nwith open('output.html_content', 'w') as f:\n    f.write(html_output)\n\nprint(html_output)\n\"",
      result: {
        output:
          "\u001b[32mubuntu@sandbox:~ $\u001b[0m cd /home/ubuntu/chartmetric_analysis && python3 -c \"\nimport re\n\ndef ansi_to_html(ansi_string):\n    html_string = ansi_string\n    # Green color\n    html_string = re.sub(r'\\u001b\\[32m', '<span style=\\\"color: green;\\\">', html_string)\n    # Reset color\n    html_string = re.sub(r'\\u001b\\[0m', '</span>', html_string)\n    # Replace newlines with <br>\n    html_string = html_string.replace('\\n', '<br>')\n    return html_string\n\nansi_input = \\\"\n\u001b[32mubuntu@sandbox:~ $\u001b[0m cd /home/ubuntu && mkdir -p chartmetric_analysis && cd chartmetric_analysis && mkdir -p data\\n\\n\n\u001b[32mubuntu@sandbox:\u001b[0m ~/chartmetric_analysis $\\\"\nhtml_output = ansi_to_html(ansi_input)\n\nwith open('output.html_content', 'w') as f:\n    f.write(html_output)\n\nprint(html_output)\n\"\nbash: cd: /home/ubuntu/chartmetric_analysis: No such file or directory\n\u001b[32mubuntu@sandbox:~ $\u001b[0m",
      },
      status: 'success',
    },
    step_id: 'step2',
  },
  {
    id: 'WmCM53z9dtQzYQ598XatBc',
    type: 'liveStatus',
    timestamp: 1748438221172,
    content: '更新计划',
    step_id: 'step2',
  },
  {
    id: '2TOZBDhfPWANAXsR1AacGE',
    type: 'plan_update',
    content: '计划更新说明',
    detail: {
      action: 'update', // add/update/remove
      steps: [
        {
          id: 'step2',
          title: '验证公园的信息和地理位置',
          description: '步骤2的描述',
          status: 'success',
          started_at: 1748438204041,
        },
        {
          id: 'step3',
          title: '整理公园的详细信息成文档',
          description: '步骤3的描述',
          status: 'running',
          started_at: 1748438204041,
        },
      ],
    },
    timestamp: 1748438221172,
  },
  {
    id: 'QWXlAjDX3qevDfNWkKr2d5',
    type: 'liveStatus',
    timestamp: 1748438269328,
    content: '使用终端',
    step_id: 'step3',
  },
  {
    id: 'Kyiz0OoxoY7PORLfi9c0nn',
    type: 'liveStatus',
    timestamp: 1748438272558,
    content: '编辑文件 zhongguancun_parks/todo.md',
    step_id: 'step3',
  },
  {
    id: 'lS6xqH24ABeLKSv2U6SlFg',
    type: 'tool_call',
    content: '正在创建文件 `zhongguancun_parks/todo.md`',
    detail: {
      tool: 'code',
      action: '正在创建文件',
      param: `zhongguancun_parks/todo.md`,
      status: 'pending',
    },
    step_id: 'step3',
  },
  {
    id: 'chunk_1748438204041_11',
    type: 'tool_result',
    content: '正在创建文件',
    detail: {
      tool: 'code',
      action: '正在创建文件',
      param: `zhongguancun_parks/todo.md`,
      file: 'zhongguancun_parks/todo.md',
      language: 'markdown',
      content:
        '# 中关村附近免费公园信息整理任务\n\n- [x] 搜索中关村附近的免费公园信息\n- [x] 核实公园的免费政策和地理位置\n- [ ] 整理中关村森林公园详细信息\n- [ ] 整理紫竹院公园详细信息\n- [ ] 整理海淀公园详细信息\n- [ ] 整理其他相关免费公园信息\n- [ ] 汇总所有信息成完整文档\n- [ ] 检查文档内容完整性和准确性\n- [ ] 将最终文档发送给用户\n',
      status: 'success',
    },
    step_id: 'step3',
  },
  {
    id: 'pdf1',
    type: 'tool_call',
    content: '正在创建文件 中关村附近免费公园信息整理.pdf',
    detail: {
      tool: 'file',
      action: '正在创建文件',
      param: '中关村附近免费公园信息整理.pdf',
      status: 'pending',
    },
    step_id: 'step3',
  },
  {
    id: 'pdf2',
    type: 'tool_result',
    content: '正在创建文件',
    detail: {
      tool: 'file',
      action: '正在创建文件',
      param: '中关村附近免费公园信息整理.pdf',
      name: '中关村附近免费公园信息整理.pdf',
      url: 'https://arxiv.org/pdf/2506.15664?page=6',
      status: 'success',
    },
    step_id: 'step3',
  },
  {
    id: '2lhGlOxoO6orsUeAZiMuBp',
    type: 'liveStatus',
    timestamp: 1748438277241,
    content: '更新计划',
    step_id: 'step3',
  },
  {
    id: 'chunk_1748438204041_12',
    type: 'plan_update',
    content: '计划更新说明',
    detail: {
      action: 'update', // add/update/remove
      steps: [
        {
          id: 'step3',
          title: '整理公园的详细信息成文档',
          description: '步骤3的描述',
          status: 'success',
        },
        {
          id: 'step4',
          title: '反馈并将文档发送给用户',
          description: '步骤4的描述',
          status: 'running',
        },
      ],
    },
  },
  {
    id: 'jTWyxQnGWb13oZURpTgvSi',
    type: 'liveStatus',
    timestamp: 1748438439005,
    content: '已完成所有任务，正在发送最终文档和全部相关文件给用户',
    step_id: 'step4',
  },
  {
    id: 'f3AQYxP9n4j3wUgUy3Gjxa',
    type: 'text',
    content: '已完成',
    attachments: [
      {
        uid: '1',
        name: 'excel-file.xlsx',
        size: 111111,
      },
      {
        uid: '2',
        name: 'word-file.docx',
        size: 222222,
      },
      {
        uid: '3',
        name: 'image-file.png',
        size: 333333,
      },
      {
        uid: '4',
        name: 'pdf-file.pdf',
        size: 444444,
      },
      {
        uid: '5',
        name: 'ppt-file.pptx',
        size: 555555,
      },
      {
        uid: '6',
        name: 'video-file.mp4',
        size: 666666,
      },
      {
        uid: '7',
        name: 'audio-file.mp3',
        size: 777777,
      },
      {
        uid: '8',
        name: 'zip-file.zip',
        size: 888888,
      },
      {
        uid: '9',
        name: 'markdown-file.md',
        size: 999999,
        description: 'Custom description here',
      },
      {
        uid: '10',
        name: 'image-file.png',
        thumbUrl: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
        url: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
        size: 123456,
      },
    ],
  },
  {
    id: 'tJ0BmayO3CgqyBVxqR0IyR',
    type: 'plan_update',
    content: '计划更新说明',
    detail: {
      action: 'update', // add/update/remove
      steps: [
        {
          id: 'step4',
          title: '反馈并将文档发送给用户',
          description: '步骤4的描述',
          status: 'success',
        },
      ],
    },
    timestamp: 1748438439005,
  },
];

export const mockPhoneStartApp = [
  {
    id: '1752139298251_0ac8adff',
    role: 'assistant',
    type: 'tool_call',
    content: 'phone_start_app',
    detail: {
      tool: 'phone_start_app',
      param: {
        package: 'com.android.calculator2',
      },
      status: 'pending',
      output: {},
      run_id: '3a0e5e9a-bf55-4bb1-bf8d-bd7a19a9dd0d',
    },
    timestamp: 1752193298302,
  },
  {
    id: '1752139304579_b39be6a0',
    role: 'assistant',
    type: 'tool_result',
    content:
      '{"result":"Started com.android.calculator2", "current_state":{"clickable_elements":[{"text":"更多选项", "className":"ImageButton", "index":0, "bounds":"640,56,720,152", "resourceId":"", "type":"clickable", "isParent":true}, {"text":"digit_7", "className":"Button", "index":2, "bounds":"16,476,173,667", "resourceId":"com.android.calculator2:id/digit_7", "type":"clickable", "isParent":true}, {"text":"digit_8", "className":"Button", "index":3, "bounds":"173,476,331,667", "resourceId":"com.android.calculator2:id/digit_8", "type":"clickable", "isParent":true}, {"text":"digit_9", "className":"Button", "index":4, "bounds":"331,476,488,667", "resourceId":"com.android.calculator2:id/digit_9", "type":"clickable", "isParent":true}, {"text":"digit_4", "className":"Button", "index":5, "bounds":"16,667,173,858", "resourceId":"com.android.calculator2:id/digit_4", "type":"clickable", "isParent":true}, {"text":"digit_5", "className":"Button", "index":6, "bounds":"173,667,331,858", "resourceId":"com.android.calculator2:id/digit_5", "type":"clickable", "isParent":true}, {"text":"digit_6", "className":"Button", "index":7, "bounds":"331,667,488,858", "resourceId":"com.android.calculator2:id/digit_6", "type":"clickable", "isParent":true}, {"text":"digit_1", "className":"Button", "index":8, "bounds":"16,858,173,1049", "resourceId":"com.android.calculator2:id/digit_1", "type":"clickable", "isParent":true}, {"text":"digit_2", "className":"Button", "index":9, "bounds":"173,858,331,1049", "resourceId":"com.android.calculator2:id/digit_2", "type":"clickable", "isParent":true}, {"text":"digit_3", "className":"Button", "index":10, "bounds":"331,858,488,1049", "resourceId":"com.android.calculator2:id/digit_3", "type":"clickable", "isParent":true}, {"text":"dec_point", "className":"Button", "index":11, "bounds":"16,1049,173,1240", "resourceId":"com.android.calculator2:id/dec_point", "type":"clickable", "isParent":true}, {"text":"digit_0", "className":"Button", "index":12, "bounds":"173,1049,331,1240", "resourceId":"com.android.calculator2:id/digit_0", "type":"clickable", "isParent":true}, {"text":"eq", "className":"Button", "index":13, "bounds":"331,1049,488,1240", "resourceId":"com.android.calculator2:id/eq", "type":"clickable", "isParent":true}, {"text":"DEL del", "className":"Button", "index":14, "bounds":"512,468,664,621", "resourceId":"com.android.calculator2:id/del", "type":"clickable", "isParent":true}, {"text":"op_div", "className":"Button", "index":15, "bounds":"512,621,664,774", "resourceId":"com.android.calculator2:id/op_div", "type":"clickable", "isParent":true}, {"text":"op_mul", "className":"Button", "index":16, "bounds":"512,774,664,927", "resourceId":"com.android.calculator2:id/op_mul", "type":"clickable", "isParent":true}, {"text":"op_sub", "className":"Button", "index":17, "bounds":"512,927,664,1080", "resourceId":"com.android.calculator2:id/op_sub", "type":"clickable", "isParent":true}, {"text":"op_add", "className":"Button", "index":18, "bounds":"512,1080,664,1232", "resourceId":"com.android.calculator2:id/op_add", "type":"clickable", "isParent":true}, {"text":"高级操作 pad_advanced", "className":"ViewGroup", "index":19, "bounds":"672,452,720,1280", "resourceId":"com.android.calculator2:id/pad_advanced", "type":"clickable", "isParent":true}, {"text":"无任何公式 formula", "className":"TextView", "index":20, "bounds":"0,160,720,299", "resourceId":"com.android.calculator2:id/formula", "type":"text", "isParent":false, "parentIndex":1}, {"text":"INV toggle_inv", "className":"Button", "index":21, "bounds":"708,476,720,628", "resourceId":"com.android.calculator2:id/toggle_inv", "type":"clickable", "isParent":false, "parentIndex":19}, {"text":"sin fun_sin", "className":"Button", "index":22, "bounds":"708,628,720,781", "resourceId":"com.android.calculator2:id/fun_sin", "type":"clickable", "isParent":false, "parentIndex":19}, {"text":"ln fun_ln", "className":"Button", "index":23, "bounds":"708,781,720,934", "resourceId":"com.android.calculator2:id/fun_ln", "type":"clickable", "isParent":false, "parentIndex":19}, {"text":"const_pi", "className":"Button", "index":24, "bounds":"708,934,720,1087", "resourceId":"com.android.calculator2:id/const_pi", "type":"clickable", "isParent":false, "parentIndex":19}, {"text":"lparen", "className":"Button", "index":25, "bounds":"708,1087,720,1240", "resourceId":"com.android.calculator2:id/lparen", "type":"clickable", "isParent":false, "parentIndex":19}], "screenshot_url":"https://console-boe.lingyiwanwu.net/boway/sandbox/empty/browser_screenshots/77d032d8-1343-4cf8-8e64-840f30d05fd5.png"}}',
    detail: {
      tool: 'phone_start_app',
      run_id: '3a0e5e9a-bf55-4bb1-bf8d-bd7a19a9dd0d',
      output: {
        content:
          '{"result":"Started com.android.calculator2", "current_state":{"clickable_elements":[{"text":"更多选项", "className":"ImageButton", "index":0, "bounds":"640,56,720,152", "resourceId":"", "type":"clickable", "isParent":true}, {"text":"digit_7", "className":"Button", "index":2, "bounds":"16,476,173,667", "resourceId":"com.android.calculator2:id/digit_7", "type":"clickable", "isParent":true}, {"text":"digit_8", "className":"Button", "index":3, "bounds":"173,476,331,667", "resourceId":"com.android.calculator2:id/digit_8", "type":"clickable", "isParent":true}, {"text":"digit_9", "className":"Button", "index":4, "bounds":"331,476,488,667", "resourceId":"com.android.calculator2:id/digit_9", "type":"clickable", "isParent":true}, {"text":"digit_4", "className":"Button", "index":5, "bounds":"16,667,173,858", "resourceId":"com.android.calculator2:id/digit_4", "type":"clickable", "isParent":true}, {"text":"digit_5", "className":"Button", "index":6, "bounds":"173,667,331,858", "resourceId":"com.android.calculator2:id/digit_5", "type":"clickable", "isParent":true}, {"text":"digit_6", "className":"Button", "index":7, "bounds":"331,667,488,858", "resourceId":"com.android.calculator2:id/digit_6", "type":"clickable", "isParent":true}, {"text":"digit_1", "className":"Button", "index":8, "bounds":"16,858,173,1049", "resourceId":"com.android.calculator2:id/digit_1", "type":"clickable", "isParent":true}, {"text":"digit_2", "className":"Button", "index":9, "bounds":"173,858,331,1049", "resourceId":"com.android.calculator2:id/digit_2", "type":"clickable", "isParent":true}, {"text":"digit_3", "className":"Button", "index":10, "bounds":"331,858,488,1049", "resourceId":"com.android.calculator2:id/digit_3", "type":"clickable", "isParent":true}, {"text":"dec_point", "className":"Button", "index":11, "bounds":"16,1049,173,1240", "resourceId":"com.android.calculator2:id/dec_point", "type":"clickable", "isParent":true}, {"text":"digit_0", "className":"Button", "index":12, "bounds":"173,1049,331,1240", "resourceId":"com.android.calculator2:id/digit_0", "type":"clickable", "isParent":true}, {"text":"eq", "className":"Button", "index":13, "bounds":"331,1049,488,1240", "resourceId":"com.android.calculator2:id/eq", "type":"clickable", "isParent":true}, {"text":"DEL del", "className":"Button", "index":14, "bounds":"512,468,664,621", "resourceId":"com.android.calculator2:id/del", "type":"clickable", "isParent":true}, {"text":"op_div", "className":"Button", "index":15, "bounds":"512,621,664,774", "resourceId":"com.android.calculator2:id/op_div", "type":"clickable", "isParent":true}, {"text":"op_mul", "className":"Button", "index":16, "bounds":"512,774,664,927", "resourceId":"com.android.calculator2:id/op_mul", "type":"clickable", "isParent":true}, {"text":"op_sub", "className":"Button", "index":17, "bounds":"512,927,664,1080", "resourceId":"com.android.calculator2:id/op_sub", "type":"clickable", "isParent":true}, {"text":"op_add", "className":"Button", "index":18, "bounds":"512,1080,664,1232", "resourceId":"com.android.calculator2:id/op_add", "type":"clickable", "isParent":true}, {"text":"高级操作 pad_advanced", "className":"ViewGroup", "index":19, "bounds":"672,452,720,1280", "resourceId":"com.android.calculator2:id/pad_advanced", "type":"clickable", "isParent":true}, {"text":"无任何公式 formula", "className":"TextView", "index":20, "bounds":"0,160,720,299", "resourceId":"com.android.calculator2:id/formula", "type":"text", "isParent":false, "parentIndex":1}, {"text":"INV toggle_inv", "className":"Button", "index":21, "bounds":"708,476,720,628", "resourceId":"com.android.calculator2:id/toggle_inv", "type":"clickable", "isParent":false, "parentIndex":19}, {"text":"sin fun_sin", "className":"Button", "index":22, "bounds":"708,628,720,781", "resourceId":"com.android.calculator2:id/fun_sin", "type":"clickable", "isParent":false, "parentIndex":19}, {"text":"ln fun_ln", "className":"Button", "index":23, "bounds":"708,781,720,934", "resourceId":"com.android.calculator2:id/fun_ln", "type":"clickable", "isParent":false, "parentIndex":19}, {"text":"const_pi", "className":"Button", "index":24, "bounds":"708,934,720,1087", "resourceId":"com.android.calculator2:id/const_pi", "type":"clickable", "isParent":false, "parentIndex":19}, {"text":"lparen", "className":"Button", "index":25, "bounds":"708,1087,720,1240", "resourceId":"com.android.calculator2:id/lparen", "type":"clickable", "isParent":false, "parentIndex":19}], "screenshot_url":"https://console-boe.lingyiwanwu.net/boway/sandbox/empty/browser_screenshots/77d032d8-1343-4cf8-8e64-840f30d05fd5.png"}}',
        additional_kwargs: {},
        response_metadata: {},
        type: 'tool',
        name: 'phone_start_app',
        id: null,
        tool_call_id: 'call_PBFe8QY5TUgeMNfwWuoPHTXW',
        artifact: null,
        status: 'success',
      },
      status: 'success',
    },
    timestamp: 1752193304586,
  },
];

export const mockPhoneChunk = {
  id: '1753758497627_83863269',
  role: 'assistant',
  type: 'message_to_user',
  content: '已成功进入小红书的手机号登录页面，请在手机界面输入您的手机号并完成登录操作。如需验证码或遇到问题请告知我。',
  detail: {
    attachments: [],
    scene: 'phone',
    intent_type: 'asking_user',
  },
  timestamp: 1753758497635,
};

export const mockInnerMessageChunk: InnerMessageChunk = {
  id: '1754466924252_14246b2a',
  role: 'inner_message',
  type: 'config',
  content: 'update_session',
  detail: {
    session_id: 'dcc8b24ea48445b0',
    sandbox_id: 'ib0ywjc0c00x4thwu79qi-BRD-81686B43867A4F4A',
    instance_no: 'INS-7CB5FCDE48084B41',
    access_key: '978e075cd17343bbb9d732648fa8c8e3-odm0mzk1nzk3mjk1nzu5mzq4oa',
    access_secret_key: '12bba797ce4d44f68a1b731b56aa133c',
    expire_time: '2025-08-06 16:55:10',
    user_id: '198111d5-dc05-437c-afa6-274986b907c9',
  },
  step_id: null,
  timestamp: 1754466924252,
  is_llm_message: false,
  session_id: 'dcc8b24ea48445b0',
  task_id: '1754466888313_wk74',
};
