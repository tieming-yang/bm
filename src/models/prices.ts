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
  getYearlyPriceId: () => Config.isProd ? Price.YEARLY_PRICE_ID : Price.YEARLY_PRICE_ID_TEST
}

export default Price
