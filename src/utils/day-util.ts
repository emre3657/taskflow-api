type TimeUnits = "year" | "month" | "week" | "day" | "hour" | "minute" | "second" | "milliseconds";

export function addTime(baseDate: Date, amountAdded: number, timeUnit: TimeUnits): Date {
  // Get time of the baseDate
  const newDate = new Date(baseDate.getTime());

  switch(timeUnit) {
    case "milliseconds":
      newDate.setMilliseconds(newDate.getMilliseconds() + amountAdded);
      break;
    case "second":
      newDate.setSeconds(newDate.getSeconds() + amountAdded);
      break;
    case "minute":
      newDate.setMinutes(newDate.getMinutes() + amountAdded);
      break;
    case "hour":
      newDate.setHours(newDate.getHours() + amountAdded);
      break;
    case "day":
      newDate.setDate(newDate.getDate() + amountAdded);
      break;
    case "week":
      newDate.setDate(newDate.getDate() + (amountAdded * 7));
      break;
    case "month":
      newDate.setMonth(newDate.getMonth() + amountAdded);
      break;
    case "year":
      newDate.setFullYear(newDate.getFullYear() + amountAdded);
      break;
    default:
      throw new Error("Invalid time unit");
  }

  return newDate;
}