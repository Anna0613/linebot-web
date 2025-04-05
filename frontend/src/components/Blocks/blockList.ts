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

export const blockList = [
    { type: 'text', label: '文字', component: TextBlock, category: 'component' },
    { type: 'image', label: '圖片', component: ImageBlock, category: 'component' },
    { type: 'button', label: '按鈕', component: ButtonBlock, category: 'component' },
    { type: 'icon', label: '圖示', component: IconBlock, category: 'component' },
    { type: 'video', label: '影片', component: VideoBlock, category: 'component' },
    { type: 'color', label: '顏色', component: ColorBlock, category: 'style' },
    { type: 'size', label: '尺寸', component: SizeBlock, category: 'style' },
    { type: 'width', label: '寬', component: WidthBlock, category: 'style' },
    { type: 'height', label: '長', component: HeightBlock, category: 'style' },
    { type: 'message', label: '單一訊息', component: MessageOneBlock, category: 'container' },
    { type: 'messagess', label: '多重訊息', component: MessageManyBlock, category: 'container' },
  ];
  
