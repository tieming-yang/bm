import Config from "./config"

const Price = {
  LIFE_TIME_PRICE: "777",
  LIFE_TIME_PRICE_ID: "price_1SbRLZCEoRN5rFZ6gmfHPy8q",
  LIFE_TIME_PRICE_ID_TEST: "price_1SbNmUCSXuz1o7ASrw8MxQDR",
  getLiftTimePriceId: () => Config.isProd ? Price.LIFE_TIME_PRICE_ID : Price.LIFE_TIME_PRICE_ID_TEST,

  MONTHLY_PRICE: "7.7",
  MONTHLY_PRICE_ID: "price_1SdH4ECEoRN5rFZ6dfm9dvCl",
  MONTHLY_PRICE_ID_TEST: "price_1SbS5MCSXuz1o7AScAuHI3wS",
  getMonthlyPriceId: () => Config.isProd ? Price.MONTHLY_PRICE_ID : Price.MONTHLY_PRICE_ID_TEST,

  YEARLY_PRICE: "77",
  YEARLY_PRICE_ID: "price_1SdH4iCEoRN5rFZ6OAmwBwoE",
  YEARLY_PRICE_ID_TEST: "price_1SdH9HCSXuz1o7ASsWvUsbMX",
  getYearlyPriceId: () => Config.isProd ? Price.YEARLY_PRICE_ID : Price.YEARLY_PRICE_ID_TEST,

  ORG_LIFE_TIME_PRICE: "7777",
  ORG_LIFE_TIME_PRICE_ID: "price_1SgAx0CEoRN5rFZ6xTo1FdZt",
  ORG_LIFE_TIME_PRICE_ID_TEST: "price_1SfR7LCSXuz1o7ASRo34ykPg",
  ORG_LIFE_TIME_COUPON_CODE: "CHURCH50OFF",
  ORG_LIFE_TIME_COUPON_ID: "1PH8KtEe",
  ORG_LIFE_TIME_COUPON_ID_TEST: "ihn1UBXW",
  getORGLifeTimeCouponId: () => Config.isProd ? Price.ORG_LIFE_TIME_COUPON_ID : Price.ORG_LIFE_TIME_COUPON_ID_TEST,
  getORGLieftTimePriceId: () => Config.isProd ? Price.ORG_LIFE_TIME_PRICE_ID : Price.ORG_LIFE_TIME_PRICE_ID_TEST
}

export default Price
