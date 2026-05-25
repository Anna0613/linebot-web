import { API_CONFIG } from '@/config/apiConfig';

export interface FlexBlockLike {
  blockType: string;
  blockData: Record<string, unknown>;
}

export interface FlexMessageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FlexPlacementValidationResult {
  isValid: boolean;
  reason?: string;
  suggestions?: string[];
}

const IGNORED_VALUES = new Set(['', 'none', 'transparent', 'undefined']);

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const addStringProp = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  fallback = '',
) => {
  const stringValue = asString(value, fallback);
  if (!IGNORED_VALUES.has(stringValue)) {
    target[key] = stringValue;
  }
};

const addNumberProp = (target: Record<string, unknown>, key: string, value: unknown) => {
  const numberValue = asNumber(value);
  if (numberValue !== undefined) {
    target[key] = numberValue;
  }
};

const normalizeAction = (action: unknown, fallbackLabel: string): Record<string, unknown> => {
  const source = action && typeof action === 'object' ? action as Record<string, unknown> : {};
  const type = asString(source.type, 'message');
  const label = asString(source.label, fallbackLabel || '按鈕');

  if (type === 'uri') {
    return {
      type,
      label,
      uri: asString(source.uri, 'https://line.me'),
    };
  }

  if (type === 'postback') {
    return {
      type,
      label,
      data: asString(source.data, label),
      displayText: asString(source.displayText, label),
    };
  }

  return {
    type: 'message',
    label,
    text: asString(source.text, label),
  };
};

export const buildMinioProxyUrl = (objectPath?: unknown): string => {
  if (!objectPath || typeof objectPath !== 'string') return '';
  const params = new URLSearchParams({ object_path: objectPath });
  return `${API_CONFIG.UNIFIED.BASE_URL}/minio/proxy?${params.toString()}`;
};

export const getImagePreviewUrl = (blockData: Record<string, unknown>): string => (
  asString(blockData.previewUrl) ||
  buildMinioProxyUrl(blockData.imageObjectPath) ||
  asString(blockData.url) ||
  ''
);

const getFlexBlockName = (block: FlexBlockLike): string => {
  const data = block.blockData || {};
  if (block.blockType === 'flex-container') {
    if (data.containerType === 'bubble') return 'Bubble 容器';
    if (data.containerType === 'box') return 'Box 內容區塊';
    if (data.containerType === 'carousel') return 'Carousel 容器';
    return 'Flex 容器';
  }
  if (block.blockType === 'flex-content') {
    if (data.contentType === 'text') return '文字';
    if (data.contentType === 'image') return '圖片';
    if (data.contentType === 'button') return '按鈕';
    if (data.contentType === 'separator') return '分隔線';
    return 'Flex 內容';
  }
  if (block.blockType === 'flex-layout') {
    if (data.layoutType === 'spacer') return '間距';
    if (data.layoutType === 'filler') return '填充';
    return 'Flex 佈局';
  }
  return asString(data.title, block.blockType || '未知元件');
};

export const validateFlexMessageBlocks = (blocks: FlexBlockLike[]): FlexMessageValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const carouselBlocks = blocks.filter(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'carousel',
  );
  const bubbleBlocks = blocks.filter(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
  );
  const hasCarousel = carouselBlocks.length > 0;

  blocks.forEach((block, index) => {
    const data = block.blockData || {};
    const label = `${index + 1}. ${getFlexBlockName(block)}`;

    if (!['flex-container', 'flex-content', 'flex-layout'].includes(block.blockType)) {
      errors.push(`${label} 不是 Flex Message 可使用的元件`);
      return;
    }

    if (block.blockType === 'flex-container') {
      if (!['bubble', 'box', 'carousel'].includes(asString(data.containerType))) {
        errors.push(`${label} 的容器類型無效`);
      }
    }

    if (block.blockType === 'flex-content') {
      if (!['text', 'image', 'button', 'separator'].includes(asString(data.contentType))) {
        errors.push(`${label} 的內容類型無效`);
      }
    }

    if (block.blockType === 'flex-layout') {
      if (!['spacer', 'filler'].includes(asString(data.layoutType))) {
        errors.push(`${label} 的佈局類型無效`);
      }
    }
  });

  if (carouselBlocks.length > 1) {
    errors.push('一個 Flex Message 只能有一個 Carousel 容器');
  }

  if (hasCarousel) {
    if (blocks[0]?.blockType !== 'flex-container' || blocks[0]?.blockData.containerType !== 'carousel') {
      errors.push('Carousel 容器必須放在 Flex Message 結構最外層');
    }

    if (bubbleBlocks.length === 0) {
      errors.push('Carousel 至少需要一個 Bubble 卡片');
    }

    if (bubbleBlocks.length > 12) {
      errors.push('LINE Flex Carousel 最多只能包含 12 個 Bubble 卡片');
    }

    let seenBubbleInCurrentSegment = false;
    blocks.forEach((block) => {
      if (block.blockType === 'flex-container' && block.blockData.containerType === 'carousel') return;

      if (block.blockType === 'flex-container' && block.blockData.containerType === 'bubble') {
        seenBubbleInCurrentSegment = true;
        return;
      }

      if (block.blockType === 'flex-container' && block.blockData.containerType === 'box') {
        if (!seenBubbleInCurrentSegment) {
          errors.push('Carousel 中的 Box 必須放在某一個 Bubble 後面');
        }
      }

      if ((block.blockType === 'flex-content' || block.blockType === 'flex-layout') && !seenBubbleInCurrentSegment) {
        errors.push('Carousel 中的內容元件必須放在某一個 Bubble 後面');
      }
    });
  } else {
    if (bubbleBlocks.length > 1) {
      errors.push('一個 Flex Message 只能有一個 Bubble 容器；多卡片請改用 Carousel 容器');
    }
  }

  if (blocks.length > 0 && !blocks.some((block) => block.blockType === 'flex-content' || block.blockType === 'flex-layout')) {
    warnings.push('建議至少加入一個文字、圖片、按鈕或佈局元件');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const validateFlexBlockPlacement = (
  blocks: FlexBlockLike[],
  blockToAdd: FlexBlockLike,
  insertIndex = blocks.length,
): FlexPlacementValidationResult => {
  if (!['flex-container', 'flex-content', 'flex-layout'].includes(blockToAdd.blockType)) {
    return {
      isValid: false,
      reason: '此元件不屬於 Flex Message 結構',
      suggestions: ['請使用 Flex Message 編輯器左側的容器、內容或佈局元件'],
    };
  }

  if (blockToAdd.blockType === 'flex-container') {
    const containerType = asString(blockToAdd.blockData?.containerType);
    if (containerType === 'carousel') {
      if (blocks.some((block) => block.blockType === 'flex-container' && block.blockData.containerType === 'carousel')) {
        return {
          isValid: false,
          reason: '一個 Flex Message 只能有一個 Carousel 容器',
          suggestions: ['請在現有 Carousel 裡新增 Bubble 卡片'],
        };
      }

      if (blocks.length > 0) {
        return {
          isValid: false,
          reason: 'Carousel 必須是 Flex Message 最外層容器',
          suggestions: ['請先建立新的 Flex Message，再從 Carousel 容器開始設計'],
        };
      }

      return { isValid: true };
    }

    const hasCarousel = blocks.some(
      (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'carousel',
    );

    if (
      containerType === 'bubble' &&
      !hasCarousel &&
      blocks.some((block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble')
    ) {
      return {
        isValid: false,
        reason: '單一卡片 Flex Message 只能有一個 Bubble 容器',
        suggestions: ['若要建立多張卡片，請先建立 Carousel 容器'],
      };
    }

    if (containerType === 'bubble' && hasCarousel) {
      const bubbleCount = blocks.filter(
        (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
      ).length;

      if (bubbleCount >= 12) {
        return {
          isValid: false,
          reason: 'LINE Flex Carousel 最多只能包含 12 個 Bubble 卡片',
          suggestions: ['請刪除不需要的卡片後再新增'],
        };
      }
    }

    if (containerType === 'box' && hasCarousel) {
      const currentBubbleBlocks = blocks.slice(0, insertIndex).reverse();
      const previousBubbleIndex = currentBubbleBlocks.findIndex(
        (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
      );
      const previousCarouselIndex = currentBubbleBlocks.findIndex(
        (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'carousel',
      );

      if (previousBubbleIndex < 0 || (previousCarouselIndex >= 0 && previousCarouselIndex < previousBubbleIndex)) {
        return {
          isValid: false,
          reason: 'Carousel 中的 Box 必須放在某一個 Bubble 後面',
          suggestions: ['請先新增或選擇 Bubble 卡片'],
        };
      }
    }
  }

  const hasCarousel = blocks.some(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'carousel',
  );
  if (hasCarousel && blockToAdd.blockType !== 'flex-container') {
    const hasBubble = blocks.some(
      (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
    );
    if (!hasBubble) {
      return {
        isValid: false,
        reason: 'Carousel 內容必須放在 Bubble 卡片內',
        suggestions: ['請先新增 Bubble 卡片'],
      };
    }

    const firstBubbleIndex = blocks.findIndex(
      (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
    );
    if (insertIndex <= firstBubbleIndex) {
      return {
        isValid: false,
        reason: 'Carousel 中的內容元件必須放在某一個 Bubble 後面',
        suggestions: ['請插入到 Bubble 卡片內，或直接拖到畫布尾端'],
      };
    }
  }

  const nextBlocks = [...blocks];
  nextBlocks.splice(Math.max(0, Math.min(insertIndex, nextBlocks.length)), 0, blockToAdd);
  const validation = validateFlexMessageBlocks(nextBlocks);

  if (!validation.isValid) {
    return {
      isValid: false,
      reason: validation.errors[0],
      suggestions: validation.errors.slice(1),
    };
  }

  return { isValid: true };
};

export const generateFlexMessageFromBlocks = (blocks: FlexBlockLike[]): Record<string, unknown> => {
  const hasCarousel = blocks.some(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'carousel',
  );

  if (hasCarousel) {
    const groups: Array<{
      bubbleBlock?: FlexBlockLike;
      contents: FlexBlockLike[];
    }> = [];
    let currentGroup: { bubbleBlock?: FlexBlockLike; contents: FlexBlockLike[] } | null = null;

    blocks.forEach((block) => {
      const data = block.blockData || {};
      if (block.blockType === 'flex-container' && data.containerType === 'carousel') return;

      if (block.blockType === 'flex-container' && data.containerType === 'bubble') {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { bubbleBlock: block, contents: [] };
        return;
      }

      if (!currentGroup) {
        currentGroup = { contents: [] };
      }

      if (
        (block.blockType === 'flex-container' && data.containerType === 'box') ||
        block.blockType === 'flex-content' ||
        block.blockType === 'flex-layout'
      ) {
        currentGroup.contents.push(block);
      }
    });

    if (currentGroup) groups.push(currentGroup);

    return {
      type: 'carousel',
      contents: (groups.length > 0 ? groups : [{ contents: [] }]).map((group) =>
        generateBubbleFromBlocks(group.bubbleBlock, group.contents)
      ),
    };
  }

  const bubbleBlock = blocks.find(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
  );
  return generateBubbleFromBlocks(bubbleBlock, blocks);
};

const createPlaceholderText = (): Record<string, unknown> => ({
  type: 'text',
  text: '請從左側拖入元件',
  color: '#64748b',
  align: 'center',
});

const createFlexComponentFromBlock = (block: FlexBlockLike): Record<string, unknown> | null => {
    const data = block.blockData || {};

    if (block.blockType === 'flex-content') {
      if (data.contentType === 'text') {
        const text: Record<string, unknown> = {
          type: 'text',
          text: asString(data.text, '示例文字'),
        };
        addStringProp(text, 'size', data.size, 'md');
        addStringProp(text, 'weight', data.weight, 'regular');
        addStringProp(text, 'color', data.color, '#000000');
        addStringProp(text, 'style', data.style);
        addStringProp(text, 'align', data.align);
        addStringProp(text, 'gravity', data.gravity);
        addStringProp(text, 'margin', data.margin);
        addNumberProp(text, 'flex', data.flex);
        addNumberProp(text, 'maxLines', data.maxLines);
        if (typeof data.wrap === 'boolean') text.wrap = data.wrap;
        return text;
      }

      if (data.contentType === 'image') {
        const image: Record<string, unknown> = {
          type: 'image',
          url: asString(data.url, 'https://via.placeholder.com/300x200'),
        };
        addStringProp(image, 'size', data.size, 'full');
        addStringProp(image, 'aspectMode', data.aspectMode, 'cover');
        addStringProp(image, 'aspectRatio', data.aspectRatio, '20:13');
        addStringProp(image, 'align', data.align);
        addStringProp(image, 'gravity', data.gravity);
        addStringProp(image, 'backgroundColor', data.backgroundColor);
        addStringProp(image, 'margin', data.margin);
        if (data.action) image.action = normalizeAction(data.action, '圖片');
        return image;
      }

      if (data.contentType === 'button') {
        const label = asString((data.action as Record<string, unknown> | undefined)?.label, asString(data.text, '按鈕'));
        const button: Record<string, unknown> = {
          type: 'button',
          action: normalizeAction(data.action, label),
        };
        addStringProp(button, 'height', data.height, 'sm');
        addStringProp(button, 'style', data.style, 'primary');
        addStringProp(button, 'color', data.color);
        addStringProp(button, 'margin', data.margin);
        return button;
      }

      if (data.contentType === 'separator') {
        const separator: Record<string, unknown> = { type: 'separator' };
        addStringProp(separator, 'margin', data.margin, 'md');
        addStringProp(separator, 'color', data.color);
        return separator;
      }
    }

    if (block.blockType === 'flex-layout') {
      if (data.layoutType === 'spacer') {
        const spacer: Record<string, unknown> = { type: 'spacer' };
        addStringProp(spacer, 'size', data.size, 'md');
        return spacer;
      }

      if (data.layoutType === 'filler') {
        const filler: Record<string, unknown> = { type: 'filler' };
        addNumberProp(filler, 'flex', data.flex ?? 1);
        return filler;
      }
    }

  return null;
};

const createBoxComponent = (
  boxBlock: FlexBlockLike | undefined,
  contents: Record<string, unknown>[],
  includeMargin = false,
): Record<string, unknown> => {
  const boxData = boxBlock?.blockData || {};
  const box: Record<string, unknown> = {
    type: 'box',
    layout: asString(boxBlock?.blockData.layout, 'vertical'),
    contents: contents.length > 0 ? contents : [createPlaceholderText()],
  };

  addStringProp(box, 'spacing', boxData.spacing, 'md');
  addStringProp(box, 'backgroundColor', boxData.backgroundColor);
  addStringProp(box, 'borderColor', boxData.borderColor);
  addStringProp(box, 'borderWidth', boxData.borderWidth);
  addStringProp(box, 'cornerRadius', boxData.cornerRadius);
  addStringProp(box, 'paddingAll', boxData.paddingAll);
  addStringProp(box, 'paddingTop', boxData.paddingTop);
  addStringProp(box, 'paddingBottom', boxData.paddingBottom);
  addStringProp(box, 'paddingStart', boxData.paddingStart);
  addStringProp(box, 'paddingEnd', boxData.paddingEnd);
  if (includeMargin) addStringProp(box, 'margin', boxData.margin);

  return box;
};

const generateBubbleFromBlocks = (
  bubbleBlock: FlexBlockLike | undefined,
  blocks: FlexBlockLike[],
): Record<string, unknown> => {
  const bodyBoxBlock = blocks.find(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'box',
  );
  const bodyContents: Record<string, unknown>[] = [];
  let activeNestedBox: { block: FlexBlockLike; contents: Record<string, unknown>[] } | null = null;

  const flushNestedBox = () => {
    if (!activeNestedBox) return;
    bodyContents.push(createBoxComponent(activeNestedBox.block, activeNestedBox.contents, true));
    activeNestedBox = null;
  };

  blocks.forEach((block) => {
    if (block.blockType === 'flex-container' && block.blockData.containerType === 'box') {
      if (block === bodyBoxBlock) return;
      flushNestedBox();
      activeNestedBox = { block, contents: [] };
      return;
    }

    const component = createFlexComponentFromBlock(block);
    if (!component) return;

    if (activeNestedBox) {
      activeNestedBox.contents.push(component);
      return;
    }

    bodyContents.push(component);
  });

  flushNestedBox();

  const body = createBoxComponent(bodyBoxBlock, bodyContents);

  const bubble: Record<string, unknown> = {
    type: 'bubble',
    body,
  };

  const bubbleData = bubbleBlock?.blockData || {};
  addStringProp(bubble, 'size', bubbleData.size);
  addStringProp(bubble, 'direction', bubbleData.direction);

  return bubble;
};
