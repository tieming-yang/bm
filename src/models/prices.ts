import Config from "./config"

const Price = {
  LIFE_TIME_PRICE_ID: "price_1SbRLZCEoRN5rFZ6gmfHPy8q",
  LIFE_TIME_PRICE_ID_TEST: "price_1SbNmUCSXuz1o7ASrw8MxQDR",

  getLiftTimePrice: () => Config.isProd ? Price.LIFE_TIME_PRICE_ID : Price.LIFE_TIME_PRICE_ID_TEST
}

export default Price