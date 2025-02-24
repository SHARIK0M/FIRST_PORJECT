
const today = new Date().toISOString().split('T')[0];//format into(YYYY-MM-DD)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate());//i set explicitly todays date
const maxDate = tomorrow.toISOString().split('T')[0];//get tomorrow date in the format of yyyy-mm-dd

// {{!-- document.getElementById("start-date").setAttribute("min", today) --}}
document.getElementById("start-date").setAttribute("max", maxDate);//user selects date upto tomorrow
document.getElementById("end-date").setAttribute("min", today)//end-date has minimum value which set as today
document.getElementById("end-date").setAttribute("max", maxDate);//end date can not be earlier than today.

// Ensure end date is greater than start date
var startDateField = document.getElementById("start-date");
var endDateField = document.getElementById("end-date");

startDateField.addEventListener("change", function () {
    endDateField.setAttribute("min", startDateField.value);
});

endDateField.addEventListener("change", function () {
    startDateField.setAttribute("max", endDateField.value);
});


const getSalesData = async() => {
const startDate = document.getElementById('start-date').value
const endDate =document.getElementById('end-date').value
 console.log(startDate, endDate) 

//custom helper

 Handlebars.registerHelper("for", function(from, to, incr, block) {
  var accum = '';
  for(var i = from; i < to; i += incr)
      accum += block.fn(i);
  return accum;
});



 // Define Handlebars template
const salesReportTemplate = `
<div class="col-xl-12">
  <!-- Account details card-->
  <div class="card mb-4">
    <div class="card-header">Sales Report 

    </div>

    <div class="card-body ml-3 p-5">
      <ul>   
        <table id="my-table" class="my-table table table-hover" style="border-top: 1px solid black;">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Order id</th>
              <th scope="col">Payment Method</th>
              <th scope="col">Coupon</th>
              <th scope="col">Coupon Used</th>
              <th scope="col">Product Details</th>
              <th scope="col">Total</th>
              
            </tr>
          </thead>
          <tbody>
            {{#each data.orders}}
            <tr>
              <td>{{this.date}}</td>
              <td>{{this.orderId}}</td>
              <td>{{this.payMethod}}</td> 
              <td>{{this.coupon}}</td>
              <td>{{this.couponUsed}}</td>
              <td>
                 {{#each this.proName}}
                 <p>Name: {{this.name}}</p>
                 <p>Quantity: {{this.quantity}}</p>
                 <p>Price: <span>₹</span>{{this.price}}</p>
                 <p>Discount Amount: <span>₹</span>{{this.discountAmt}}</p>
                 <p>DeliveryCharge:50</p>
                 {{/each}}
                 </td> 
            
              <td><span>₹</span>{{total}}</td> 
            </tr>
            {{/each}} 
          </tbody>
        </table>
                
        <h5>Total Revenue: ₹<strong class="ml-auto">{{data.grandTotal}}</strong>  </h5>
        <h5>Total Sales Count: <strong>{{data.salesCount}}</strong></h5>
        <h5>Total Discount Amount: ₹<strong class="ml-auto">{{data.overallDiscountAmount}}</strong></h5>
      </ul>
    </div>
  </div>
</div>
`;


function renderSalesReport(data) {
  const compiledTemplate = Handlebars.compile(salesReportTemplate);//handlebar.compile() converts the template string into a callable function that generate dynamic html.

  const salesReportHTML = compiledTemplate({ data: data });//invokes compiled handlebars template with data passed as an argument.Data is sales object orders,grandTtoal.Atlast sales reportHtml is a string of html that display sales report

  document.getElementById('table').innerHTML = salesReportHTML;//this line inserts generates salesReporthtml INTO the dom element.

  // Update the DataTable configuration
  $(document).ready(function () { //data table initialization only happens when the dom is fully loaded
    $('#my-table').DataTable({ //initializes the datatable 
      dom: 'Bfrtip',//button,search/filter input field,processing display,table,information(showing entries),pagination
      buttons: [//export buttons
        {
          extend: 'excelHtml5',//this tells the datatable to use the excel export functionality
          text: 'Excel',
          exportOptions: {
            columns: ':visible'  // Export visible columns
          }
        },
        {
          extend: 'pdfHtml5',//activates the pdf export functionality
          text: 'PDF',
          customize: function (doc) {
            // Extract the totals from the passed data
            const grandTotal = data.grandTotal;
            const salesCount = data.salesCount;
            const overallDiscountAmount = data.overallDiscountAmount;

            // Add the totals to the footer of the PDF
            doc.content.push({
              text: [
                `Total Revenue: ₹${grandTotal}`,
                `Total Sales Count: ${salesCount}`,
                `Total Discount Amount: ₹${overallDiscountAmount}`
              ],
              margin: [0, 20, 0, 0],  // Add some margin space to the footer
              alignment: 'left'
            });
          }
        }
      ]
    });
  });
}

// Fetch the sales data
  const response = await fetch(`/admin/get_sales?stDate=${startDate}&edDate=${endDate}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  console.log(data);

  if (data) {
    renderSalesReport(data); // Render the sales report
  }
};
