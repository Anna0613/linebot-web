import { API_CONFIG } from '@/config/apiConfig';

export interface FlexBlockLike {
  blockType: string;
  blockData: Record<string, unknown>;
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

export const generateFlexMessageFromBlocks = (blocks: FlexBlockLike[]): Record<string, unknown> => {
  const bubbleBlock = blocks.find(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
  );
  const boxBlock = blocks.find(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'box',
  );

  const contents: Record<string, unknown>[] = [];

  blocks.forEach((block) => {
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
        contents.push(text);
        return;
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
        contents.push(image);
        return;
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
        contents.push(button);
        return;
      }

      if (data.contentType === 'separator') {
        const separator: Record<string, unknown> = { type: 'separator' };
        addStringProp(separator, 'margin', data.margin, 'md');
        addStringProp(separator, 'color', data.color);
        contents.push(separator);
      }
    }

    if (block.blockType === 'flex-layout') {
      if (data.layoutType === 'spacer') {
        const spacer: Record<string, unknown> = { type: 'spacer' };
        addStringProp(spacer, 'size', data.size, 'md');
        contents.push(spacer);
      }

      if (data.layoutType === 'filler') {
        const filler: Record<string, unknown> = { type: 'filler' };
        addNumberProp(filler, 'flex', data.flex ?? 1);
        contents.push(filler);
      }
    }
  });

  if (contents.length === 0) {
    contents.push({
      type: 'text',
      text: '請從左側拖入元件',
      color: '#64748b',
      align: 'center',
    });
  }

  const body: Record<string, unknown> = {
    type: 'box',
    layout: asString(boxBlock?.blockData.layout, 'vertical'),
    contents,
  };

  const boxData = boxBlock?.blockData || {};
  addStringProp(body, 'spacing', boxData.spacing, 'md');
  addStringProp(body, 'backgroundColor', boxData.backgroundColor);
  addStringProp(body, 'borderColor', boxData.borderColor);
  addStringProp(body, 'borderWidth', boxData.borderWidth);
  addStringProp(body, 'cornerRadius', boxData.cornerRadius);
  addStringProp(body, 'paddingAll', boxData.paddingAll);
  addStringProp(body, 'paddingTop', boxData.paddingTop);
  addStringProp(body, 'paddingBottom', boxData.paddingBottom);
  addStringProp(body, 'paddingStart', boxData.paddingStart);
  addStringProp(body, 'paddingEnd', boxData.paddingEnd);

  const bubble: Record<string, unknown> = {
    type: 'bubble',
    body,
  };

  const bubbleData = bubbleBlock?.blockData || {};
  addStringProp(bubble, 'size', bubbleData.size);
  addStringProp(bubble, 'direction', bubbleData.direction);

  return bubble;
};
