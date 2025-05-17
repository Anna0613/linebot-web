const COLOR_COMPONENT = 230;
const COLOR_STYLE = 160;
const COLOR_BOX = 65;
const COLOR_CONTAINER = 0;
const COLOR_ALIGN = 290;

Blockly.defineBlocksWithJsonArray([
  //  Container 
  {
    type: 'bubble',
    message0: '單一訊息 尺寸 %1 內容 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SIZE',
        options: [
          ['nano', 'nano'], ['micro', 'micro'], ['deca', 'deca'], ['hecto', 'hecto'],
          ['kilo', 'kilo'], ['mega', 'mega'], ['giga', 'giga']
        ]
      },
      {
        type: 'input_statement',
        name: 'BLOCKS',
        check: ['block']
      }
    ],
    output: 'container',
    colour: COLOR_CONTAINER,
    tooltip: '單一訊息 bubble 容器'
  },
  {
    type: 'carousel',
    message0: '多重訊息 尺寸 %1 含訊息 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SIZE',
        options: [
          ['nano', 'nano'], ['micro', 'micro'], ['deca', 'deca'], ['hecto', 'hecto'],
          ['kilo', 'kilo'], ['mega', 'mega'], ['giga', 'giga']
        ]
      },
      {
        type: 'input_statement',
        name: 'BUBBLES',
        check: ['container']
      }
    ],
    output: 'container',
    colour: COLOR_CONTAINER,
    tooltip: '最多 12 個 bubble 組成的 carousel 容器'
  },

  //  Block 
  {
    type: 'block_section',
    message0: '%1 區塊含 Box %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SECTION',
        options: [['header', 'header'], ['hero', 'hero'], ['body', 'body'], ['footer', 'footer']]
      },
      {
        type: 'input_value',
        name: 'BOX',
        check: 'box'
      }
    ],
    previousStatement: 'block',
    nextStatement: 'block',
    colour: COLOR_CONTAINER,
    tooltip: 'Flex Block 區塊：header/hero/body/footer'
  },

  // Box 
  {
    type: 'box',
    message0: 'Box 排列 %1 主軸對齊 %2 交叉對齊 %3 內容 %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'LAYOUT',
        options: [
          ['水平', 'horizontal'], ['垂直', 'vertical'], ['基準線', 'baseline']
        ]
      },
      {
        type: 'field_dropdown',
        name: 'JUSTIFY',
        options: [
          ['start', 'start'], ['center', 'center'], ['end', 'end'],
          ['space-between', 'space-between'], ['space-around', 'space-around']
        ]
      },
      {
        type: 'field_dropdown',
        name: 'ALIGN',
        options: [
          ['start', 'start'], ['center', 'center'], ['end', 'end']
        ]
      },
      {
        type: 'input_statement',
        name: 'CONTENTS',
        check: 'component'
      }
    ],
    output: 'box',
    colour: COLOR_BOX,
    tooltip: '排列與對齊內容的 Box 容器'
  },

  // Component
  {
    type: 'text',
    message0: '文字 %1 顏色 %2 大小 %3 粗細 %4 裝飾 %5 換行 %6',
    args0: [
      { type: 'field_input', name: 'TEXT', text: '文字內容' },
      { type: 'field_colour', name: 'COLOR', colour: '#000000' },
      { type: 'field_dropdown', name: 'SIZE', options: [['sm', 'sm'], ['md', 'md'], ['lg', 'lg']] },
      { type: 'field_dropdown', name: 'WEIGHT', options: [['regular', 'regular'], ['bold', 'bold']] },
      { type: 'field_dropdown', name: 'DECORATION', options: [['none', 'none'], ['underline', 'underline'], ['line-through', 'line-through']] },
      { type: 'field_checkbox', name: 'WRAP', checked: true }
    ],
    output: 'component',
    colour: COLOR_COMPONENT,
    tooltip: '顯示一段可設定樣式的文字'
  },
  {
    type: 'image',
    message0: '圖片 URL %1 尺寸 %2',
    args0: [
      { type: 'field_input', name: 'URL', text: 'https://...' },
      { type: 'field_dropdown', name: 'SIZE', options: [['sm', 'sm'], ['md', 'md'], ['lg', 'lg'], ['full', 'full']] }
    ],
    output: 'component',
    colour: COLOR_COMPONENT,
    tooltip: '顯示圖片 (JPG/PNG)' 
  },
  {
    type: 'button',
    message0: '按鈕 %1 樣式 %2 顏色 %3 高度 %4',
    args0: [
      { type: 'field_input', name: 'TEXT', text: '點我' },
      { type: 'field_dropdown', name: 'STYLE', options: [['primary', 'primary'], ['secondary', 'secondary'], ['link', 'link']] },
      { type: 'field_colour', name: 'COLOR', colour: '#00B900' },
      { type: 'field_dropdown', name: 'HEIGHT', options: [['sm', 'sm'], ['md', 'md']] }
    ],
    output: 'component',
    colour: COLOR_COMPONENT,
    tooltip: '按鈕元件'
  },
  {
    type: 'separator',
    message0: '分隔線 顏色 %1',
    args0: [
      { type: 'field_colour', name: 'COLOR', colour: '#AAAAAA' }
    ],
    output: 'component',
    colour: COLOR_COMPONENT,
    tooltip: '顯示分隔線'
  },
  {
    type: 'icon',
    message0: '圖示 類型 %1 大小 %2',
    args0: [
      { type: 'field_dropdown', name: 'ICON_TYPE', options: [['star', 'star'], ['heart', 'heart'], ['smile', 'smile']] },
      { type: 'field_dropdown', name: 'SIZE', options: [['xxs', 'xxs'], ['sm', 'sm'], ['md', 'md'], ['lg', 'lg']] }
    ],
    output: 'component',
    colour: COLOR_COMPONENT,
    tooltip: '顯示圖示 icon'
  },
  {
    type: 'video',
    message0: '影片 URL %1 尺寸 %2',
    args0: [
      { type: 'field_input', name: 'URL', text: 'https://...' },
      { type: 'field_dropdown', name: 'SIZE', options: [['sm', 'sm'], ['md', 'md'], ['lg', 'lg'], ['full', 'full']] }
    ],
    output: 'component',
    colour: COLOR_COMPONENT,
    tooltip: '顯示影片 (mp4, HTTPS, 最多 200MB)'
  },
  {
    type: 'span',
    message0: '多樣式文字片段 %1 顏色 %2 粗細 %3 裝飾 %4',
    args0: [
      { type: 'field_input', name: 'TEXT', text: '多樣式內容' },
      { type: 'field_colour', name: 'COLOR', colour: '#000000' },
      { type: 'field_dropdown', name: 'WEIGHT', options: [['regular', 'regular'], ['bold', 'bold']] },
      { type: 'field_dropdown', name: 'DECORATION', options: [['none', 'none'], ['underline', 'underline'], ['line-through', 'line-through']] }
    ],
    output: 'component',
    colour: COLOR_COMPONENT,
    tooltip: '顯示內嵌樣式文字 (span)'
  }
]);