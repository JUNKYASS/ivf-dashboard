export const WAREHOUSE_ID = 'СЦ (Коляново) (1020002072018000)';
export const NAME_POSTFIX = '+2% к прайсу';
export const DEFAULT_TEXDESIGN_URL = 'https://texdesign.ru/bitrix/catalog_export/cloth.xml';

export const GT_BYAZ_220_120_SHEETNAME = 'GT_Byaz_220_120';
export const GT_BYAZ_220_140_SHEETNAME = 'GT_Byaz_220_140';
export const GT_BYAZ_150_120_SHEETNAME = 'GT_Byaz_150_120';
export const GT_BYAZ_150_140_SHEETNAME = 'GT_Byaz_150_140';
export const GT_BYAZ_150_120_SOLID_SHEETNAME = 'GT_Byaz_150_120_Solid';
export const GT_BYAZ_150_140_SOLID_SHEETNAME = 'GT_Byaz_150_140_Solid';
export const GT_POPLIN_220_SHEETNAME = 'GT_Poplin_220';
export const TD_SHEETNAME = 'TD';
export const AD_SHEETNAME = 'AD';
export const TDL_BYAZ_220_SOLID_SHEETNAME = 'TDL_Byaz_220_solid';
export const LOGOS_SHEETNAME = 'LB';
export const TT_SHEETNAME = 'TT';

export const GALTEX_MATERIALS = [
  { key: 'galtex_byaz_220_120', sheetName: GT_BYAZ_220_120_SHEETNAME, label: 'Бязь 220см/120гр наб.' },
  { key: 'galtex_byaz_220_140', sheetName: GT_BYAZ_220_140_SHEETNAME, label: 'Бязь 220см/140гр наб.' },
  { key: 'galtex_byaz_150_120', sheetName: GT_BYAZ_150_120_SHEETNAME, label: 'Бязь 150см/120гр наб.' },
  { key: 'galtex_byaz_150_140', sheetName: GT_BYAZ_150_140_SHEETNAME, label: 'Бязь 150см/140гр наб.' },
  { key: 'galtex_byaz_150_120_solid', sheetName: GT_BYAZ_150_120_SOLID_SHEETNAME, label: 'Бязь 150см/120гр гл/кр' },
  { key: 'galtex_byaz_150_140_solid', sheetName: GT_BYAZ_150_140_SOLID_SHEETNAME, label: 'Бязь 150см/140гр гл/кр' },
  { key: 'galtex_poplin_220', sheetName: GT_POPLIN_220_SHEETNAME, label: 'Поплин 220' },
] as const;

export type GaltexMaterialKey = (typeof GALTEX_MATERIALS)[number]['key'];

export const GALTEX_THRESHOLD_KEYS = [
  'galtex_gt_byaz_220_120',
  'galtex_gt_byaz_220_140',
  'galtex_gt_byaz_150_120',
  'galtex_gt_byaz_150_140',
  'galtex_gt_byaz_150_120_solid',
  'galtex_gt_byaz_150_140_solid',
  'galtex_gt_poplin_220',
] as const;

export const MATERIAL_KEY_TO_THRESHOLD_KEY: Record<GaltexMaterialKey, (typeof GALTEX_THRESHOLD_KEYS)[number]> = {
  galtex_byaz_220_120: 'galtex_gt_byaz_220_120',
  galtex_byaz_220_140: 'galtex_gt_byaz_220_140',
  galtex_byaz_150_120: 'galtex_gt_byaz_150_120',
  galtex_byaz_150_140: 'galtex_gt_byaz_150_140',
  galtex_byaz_150_120_solid: 'galtex_gt_byaz_150_120_solid',
  galtex_byaz_150_140_solid: 'galtex_gt_byaz_150_140_solid',
  galtex_poplin_220: 'galtex_gt_poplin_220',
};

export const SUPPLIER_IDS = ['galtex', 'td', 'ad', 'tdl', 'logos', 'tt'] as const;
export type SupplierId = (typeof SUPPLIER_IDS)[number];
