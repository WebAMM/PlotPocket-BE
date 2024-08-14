const discountCalculator = (price, discount) => {
    let parsedPrice = parseFloat(price);
    let parsedDiscount = parseFloat(discount);
  
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return "Invalid price";
    }
    if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
      return "Invalid discount";
    }
  
    let discountAmount = (parsedPrice * parsedDiscount) / 100;
    let discountedPrice = parsedPrice - discountAmount;
  
    return discountedPrice;
  };
  
  module.exports = discountCalculator;