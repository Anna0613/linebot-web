import ButtonBlock from './ButtonBlock';
import IconBlock from './IconBlock';
import ImageBlock from './ImageBlock';
import MessageOneBlock from './MessageOneBlock';
import MessageManyBlock from './MessageManyBlock';
import ColorBlock from './ColorBlock';
import SizeBlock from './SizeBlock';
import WidthBlock from './WidthBlock';
import HeightBlock from './HeightBlock';
import TextBlock from './TextBlock';
import VideoBlock from './VideoBlock';
import SeparatorBlock from './SeparatorBlock';
import HorizontalBlock from './HorizontalBlock';
import VerticalBlock from './VerticalBlock';
import BaselineBlock from './BaselineBlock';
import SpacingBlock from './SpacingBlock';
import StartBlock from './StartBlock';
import Horizontal_CenterBlock from './Horizontal_CenterBlock';
import Vertical_CenterBlock from './Vertical_CenterBlock';
import TopBlock from './TopBlock';
import BottomBlock from './BottomBlock';
import EndBlock from './EndBlock';
import SpanBlock from './SpanBlock';

export const blockList = [
  
  //allowedParent還沒用好
    { type: 'text', label: '文字', component: TextBlock, category: 'component', allowedParent: ['box'] },
    { type: 'span', label: '多樣式文字', component: SpanBlock, category: 'component', allowedParent: ['box'] },
    { type: 'image', label: '圖片', component: ImageBlock, category: 'component', allowedParent: ['box'] },
    { type: 'button', label: '按鈕', component: ButtonBlock, category: 'component', allowedParent: ['box'] },
    { type: 'icon', label: '圖示', component: IconBlock, category: 'component', allowedParent: ['baseline']  },
    { type: 'video', label: '影片', component: VideoBlock, category: 'component', allowedParent: ['box'] },
    { type: 'separator', label: '分隔線', component: SeparatorBlock, category: 'component', allowedParent: ['box'] },

    { type: 'color', label: '顏色', component: ColorBlock, category: 'style', allowedParent: ['text', 'button', 'box', 'image'] },
    { type: 'size', label: '尺寸', component: SizeBlock, category: 'style', allowedParent: ['text','icon','span'] },
    { type: 'width', label: '寬', component: WidthBlock, category: 'style', allowedParent: ['image', 'box'] },
    { type: 'height', label: '長', component: HeightBlock, category: 'style', allowedParent: ['image', 'box'] },
    { type: 'spacing', label: '間隔', component: SpacingBlock, category: 'style', allowedParent: ['box'] },
 
    { type: 'start', label: '靠左對齊', component: StartBlock, category: 'style', allowedParent: ['horizontal', 'vertical', 'baseline'] },
    { type: 'horizontal_center', label: '置中對齊', component: Horizontal_CenterBlock, category: 'style', allowedParent: ['horizontal', 'baseline'] },
    { type: 'hend', label: '靠右對齊', component: HorizontalBlock, category: 'style', allowedParent: ['horizontal', 'baseline'] },

    { type: 'vertical_center', label: '中間對齊', component: Vertical_CenterBlock, category: 'style', allowedParent: ['vertical'] },
    { type: 'top', label: '頂部對齊', component: TopBlock, category: 'style', allowedParent: ['vertical']  },
    { type: 'bottom', label: '底部對齊', component: BottomBlock, category: 'style', allowedParent: ['vertical']  },

    { type: 'horizontal', label: '水平', component: HorizontalBlock, category: 'box', allowedParent: ['container', 'box','component'] },
    { type: 'vertical', label: '垂直', component: VerticalBlock, category: 'box', allowedParent: ['container', 'box','component'] },
    { type: 'baseline', label: '基準線', component: BaselineBlock, category: 'box', allowedParent: ['container','box','component']  },
    { type: 'end', label: '結束', component: EndBlock, category: 'box', allowedParent: ['container', 'box','component']  },

    { type: 'bubble', label: '單一訊息', component: MessageOneBlock, category: 'container', allowedParent: ['bcontainer'] },
    { type: 'carousel', label: '多重訊息', component: MessageManyBlock, category: 'container', allowedParent: ['container'] },
  ];
  
