export const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(date);
  };
  