import Config from "./config"

const Price = {
  LIFE_TIME_PRICE: "777",
  LIFE_TIME_PRICE_ID: "price_1SbRLZCEoRN5rFZ6gmfHPy8q",
  LIFE_TIME_PRICE_ID_TEST: "price_1SbNmUCSXuz1o7ASrw8MxQDR",
  getLiftTimePriceId: () => Config.isProd ? Price.LIFE_TIME_PRICE_ID : Price.LIFE_TIME_PRICE_ID_TEST,

  MONTHLY_PRICE: "7.7",
  MONTHLY_PRICE_ID: "",
  MONTHLY_PRICE_ID_TEST: "price_1SbS5MCSXuz1o7AScAuHI3wS",
  getMonthlyPriceId: () => Price.MONTHLY_PRICE_ID_TEST,

  YEARLY_PRICE: "77",
  YEARLY_PRICE_ID: "",
  YEARLY_PRICE_ID_TEST: "price_1SbS5MCSXuz1o7AScAuHI3wS",
  getYearlyPriceId: () => Price.YEARLY_PRICE_ID_TEST
}

export default Price
