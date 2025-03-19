const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate()); // Explicitly set today's date
const maxDate = tomorrow.toISOString().split('T')[0]; // Get max selectable date (tomorrow)

// Set date restrictions for start and end date inputs
document.getElementById("start-date").setAttribute("max", maxDate); // User can select up to tomorrow
document.getElementById("end-date").setAttribute("min", today); // End date cannot be before today
document.getElementById("end-date").setAttribute("max", maxDate); // End date cannot exceed tomorrow

// Ensure end date is always greater than or equal to start date
var startDateField = document.getElementById("start-date");
var endDateField = document.getElementById("end-date");

startDateField.addEventListener("change", function () {
    endDateField.setAttribute("min", startDateField.value);
});

endDateField.addEventListener("change", function () {
    startDateField.setAttribute("max", endDateField.value); 
});

// Function to fetch and render sales data
const getSalesData = async () => {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    console.log(startDate, endDate);

    // Custom Handlebars helper for looping
    Handlebars.registerHelper("for", function(from, to, incr, block) {
        let accum = '';
        for(let i = from; i < to; i += incr) {
            accum += block.fn(i);
        }
        return accum;
    });

    Handlebars.registerHelper('formatDate', function (date) {
      if (!date) return '';
      return new Date(date).toISOString().split('T')[0]; // Extract YYYY-MM-DD
  });
  
  
    // Define Handlebars template
    const salesReportTemplate = `
    <div class="col-xl-12">
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-primary text-white font-weight-bold">
          Sales Report
        </div>
        <div class="card-body p-4">
          <table id="my-table" class="table table-striped table-bordered">
            <thead class="thead-dark">
              <tr>
                <th>Date</th>
                <th>Order ID</th>
                <th>Payment Method</th>
                <th>Coupon</th>
                <th>Coupon Used</th>
                <th>Product Details</th>
                <th>Total</th>
              </tr>
            </thead>
           <tbody>
  {{#each data.orders}}
  <tr>
    <td>{{formatDate this.date}}</td>
    <td>{{this.orderId}}</td>
    <td>{{this.payMethod}}</td>
    <td>{{this.coupon}} (₹{{this.discountAmt}})</td> <!-- Updated line -->
        <td>{{#if this.discountAmt}}Yes{{else}}No{{/if}}</td> <!-- Updated line -->
    <td>
      <ul class="list-unstyled">
        {{#each this.proName}}
        <li><strong>Name:</strong> {{this.name}}</li>
        <li><strong>Quantity:</strong> {{this.quantity}}</li>
        <li><strong>Price:</strong> ₹{{this.price}}</li>
        <li><strong>Delivery Charge:</strong> ₹50</li>
        <hr>
        {{/each}}
      </ul>
    </td>
    <td class="font-weight-bold">₹{{total}}</td>
  </tr>
  {{/each}}
</tbody>

          </table>
          <div class="mt-4">
            <h5 class="text-primary">Total Revenue: ₹<strong>{{data.grandTotal}}</strong></h5>
            <h5 class="text-success">Total Sales Count: <strong>{{data.salesCount}}</strong></h5>
          </div>
        </div>
      </div>
    </div>`;
  
    function renderSalesReport(data) {
      const compiledTemplate = Handlebars.compile(salesReportTemplate);
      const salesReportHTML = compiledTemplate({ data });
      document.getElementById('table').innerHTML = salesReportHTML;
  
      // Initialize DataTable after rendering
      $(document).ready(function () {
          $('#my-table').DataTable({
              dom: 'Bfrtip',
              buttons: [
                  {
                      extend: 'excelHtml5',
                      text: 'Export to Excel',
                      title: 'Floritta',  // ✅ Set title in Excel file
                      exportOptions: {
                          columns: ':visible',
                          format: {
                              body: function (data, row, column, node) {
                                  return data.replace(/Name:/g, "\nName:")
                                             .replace(/Quantity:/g, "\nQuantity:")
                                             .replace(/Price:/g, "\nPrice:")
                                             .replace(/Delivery Charge:/g, "\nDelivery Charge:");
                              }
                          }
                      }
                  },
                  {
                      extend: 'pdfHtml5',
                      text: 'Export to PDF',
                      title: 'Floritta',  // ✅ Set Title to "Floritta" Only
                     customize: function (doc) {
    // Remove extra text
    doc.content[0].text = `Floritta\nSales Report (${startDate} to ${endDate})`; // ✅ Add date range in the title
    doc.content[0].fontSize = 16;
    doc.content[0].bold = true;
    doc.content[0].alignment = 'center';

    // Set table styles
    doc.content[1].table.widths = ['12%', '12%', '12%', '10%', '8%', '32%', '14%'];
    doc.styles.tableHeader.fillColor = 'black';
    doc.styles.tableHeader.color = 'white';
    doc.styles.tableHeader.alignment = 'center';
    doc.styles.tableHeader.bold = true;

    // Apply black borders
    doc.content[1].layout = {
        hLineWidth: function () { return 1; },
        vLineWidth: function () { return 1; },
        hLineColor: function () { return 'black'; },
        vLineColor: function () { return 'black'; },
    };

    // Remove time part from date values
    doc.content[1].table.body.forEach((row, index) => {
        if (index === 0) return; // Skip the header row
        
        // Format date column (Assuming date is in column 0)
        row[0].text = row[0].text.split(' ')[0]; // ✅ Remove time from date
    });

    // Adjust product details formatting
    doc.content[1].table.body.forEach((row, index) => {
        if (index === 0) return;
        row[5].text = row[5].text.replace(/Name:/g, "\nName:");
        row[5].text = row[5].text.replace(/Quantity:/g, "\nQuantity:");
        row[5].text = row[5].text.replace(/Price:/g, "\nPrice:");
        row[5].text = row[5].text.replace(/Delivery Charge:/g, "\nDelivery Charge:");
        row[5].alignment = 'left';
    });

    // Add Total Revenue & Sales Count at the bottom
    doc.content.push({
        text: `\nTotal Revenue: ₹${data.grandTotal}\nTotal Sales Count: ${data.salesCount}`,
        margin: [0, 20, 0, 0],
        alignment: 'left',
        bold: true
    });

    // Adjust default font size
    doc.defaultStyle.fontSize = 10;
}

                  }
              ]
          });
      });
  }
  
  
    // Fetch sales data
    const response = await fetch(`/admin/get-sales?stDate=${startDate}&edDate=${endDate}`, {
        headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    console.log(data);

    if (data) {
        renderSalesReport(data); // Render the sales report
    }
};