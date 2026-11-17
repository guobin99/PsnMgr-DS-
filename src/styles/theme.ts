import type { ThemeConfig } from 'antd'

/** 品牌常量：与 styles/global.css 的 CSS 变量保持同步 */
export const BRAND = {
  primary: '#2f6fed',
  primaryStrong: '#1f5bd8',
  teal: '#12b3a6',
  siderBg: '#0f1c33',
  siderDeep: '#0a1526',
  pageBg: '#f4f6fa',
  border: '#e7ebf3',
  textMuted: '#64748b',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#e5484d',
} as const

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorInfo: BRAND.primary,
    colorSuccess: BRAND.success,
    colorWarning: BRAND.warning,
    colorError: BRAND.danger,
    colorLink: BRAND.primary,
    colorBorderSecondary: BRAND.border,
    colorTextBase: '#1e293b',
    borderRadius: 6,
    fontSize: 14,
    fontFamily:
      '"PingFang SC", "Microsoft YaHei", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    controlHeight: 34,
    wireframe: false,
  },
  components: {
    Layout: {
      headerHeight: 56,
      headerPadding: '0',
      headerBg: '#ffffff',
      bodyBg: BRAND.pageBg,
      siderBg: BRAND.siderBg,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkPopupBg: BRAND.siderDeep,
      darkItemSelectedBg: BRAND.primary,
      darkItemHoverBg: 'rgba(255,255,255,0.08)',
      darkItemColor: 'rgba(226,232,240,0.78)',
      darkItemSelectedColor: '#ffffff',
      itemHeight: 40,
      itemMarginInline: 8,
      itemBorderRadius: 6,
      iconSize: 16,
      collapsedIconSize: 18,
      subMenuItemBg: 'transparent',
    },
    Table: {
      headerBg: '#f7f9fc',
      headerColor: '#475569',
      rowHoverBg: '#f5f8ff',
      borderColor: BRAND.border,
      cellPaddingBlock: 12,
    },
    Card: {
      headerFontSize: 15,
      paddingLG: 20,
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Tabs: {
      cardGutter: 4,
      horizontalItemPadding: '6px 12px',
    },
    Input: {
      activeShadow: '0 0 0 3px rgba(47,111,237,0.12)',
    },
    Tag: {
      defaultBg: '#f1f4f9',
    },
  },
}
