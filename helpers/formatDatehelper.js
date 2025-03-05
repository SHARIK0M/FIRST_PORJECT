module.exports = (date, format='MonDDYYYY') => {
  // Create a new Date object from the input date
  const dateObject = new Date(date);

  // Check the desired format and set the appropriate options for formatting
  if (format === "MonDDYYYY") {
    // Format: "Mon DD, YYYY" (e.g., "Mar 04, 2025")
    var options = { day: "2-digit", month: "short", year: "numeric" };
  } else if (format === "yyyy-MM-dd") {
    // Format: "YYYY-MM-DD" (e.g., "2025-03-04")
    var options = { year: "numeric", month: "2-digit", day: "2-digit" };
  } else if (format === "YYYY-MM-DD") {
    // Format: ISO string format "YYYY-MM-DD" (e.g., "2025-03-04")
    return dateObject.toISOString().split('T')[0];
  }

  // Return the formatted date based on the options
  return dateObject.toLocaleDateString("en-US", options);
};
