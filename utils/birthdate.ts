// components/BirthdateSelect.vue が未指定時に自動で入れる生年月日。
//
// 「空欄からドラムロールを回させない」ための既定値なので、逆に言うと表示された時点で
// v-model は必ずこの値で埋まる = 「ユーザーが入力したかどうか」を生年月日の有無では判定
// できない。pages/compatibility.vue は最初から6枠を並べる都合上その判定が必要なので、
// 「既定値のままかどうか」を見るためにこの定数を共有している。
export const DEFAULT_BIRTHDATE_YEAR = '1985'
export const DEFAULT_BIRTHDATE_MONTH = '1'
export const DEFAULT_BIRTHDATE_DAY = '1'

export const DEFAULT_BIRTHDATE = `${DEFAULT_BIRTHDATE_YEAR}-${DEFAULT_BIRTHDATE_MONTH.padStart(2, '0')}-${DEFAULT_BIRTHDATE_DAY.padStart(2, '0')}`
