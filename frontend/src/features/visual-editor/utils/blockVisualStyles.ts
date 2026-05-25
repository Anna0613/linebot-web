const BLOCK_COLOR_CLASS_BY_TYPE: Record<string, string> = {
  event: 'border-amber-500 bg-amber-100 text-amber-950',
  reply: 'border-emerald-500 bg-emerald-100 text-emerald-950',
  control: 'border-violet-500 bg-violet-100 text-violet-950',
  setting: 'border-slate-500 bg-slate-100 text-slate-950',
  'flex-container': 'border-indigo-500 bg-indigo-100 text-indigo-950',
  'flex-content': 'border-teal-500 bg-teal-100 text-teal-950',
  'flex-layout': 'border-cyan-500 bg-cyan-100 text-cyan-950',
};

const BLOCK_PREVIEW_COLOR_CLASS_BY_TYPE: Record<string, string> = {
  event: 'border-amber-700 bg-amber-200 text-amber-950',
  reply: 'border-emerald-700 bg-emerald-200 text-emerald-950',
  control: 'border-violet-700 bg-violet-200 text-violet-950',
  setting: 'border-slate-700 bg-slate-200 text-slate-950',
  'flex-container': 'border-indigo-700 bg-indigo-200 text-indigo-950',
  'flex-content': 'border-teal-700 bg-teal-200 text-teal-950',
  'flex-layout': 'border-cyan-700 bg-cyan-200 text-cyan-950',
};

export const getBlockColorClass = (blockType: string): string => {
  return BLOCK_COLOR_CLASS_BY_TYPE[blockType] || 'border-slate-500 bg-white text-slate-950';
};

export const getBlockPreviewColorClass = (blockType: string): string => {
  return BLOCK_PREVIEW_COLOR_CLASS_BY_TYPE[blockType] || 'border-slate-700 bg-slate-200 text-slate-950';
};
