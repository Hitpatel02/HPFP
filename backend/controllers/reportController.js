const fs = require('fs');
const path = require('path');
const { 
    generateMonthlyReport, 
    getReportData,
    getDocumentStatusByMonth,
    getClientsPendingDocuments
} = require('../services/reportService');
const { Parser } = require('json2csv');

/**
 * @desc    Generate a new monthly report with optional date filtering
 */
exports.generateReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const filePath = await generateMonthlyReport(startDate, endDate);
        res.json({ 
            message: 'Report generated successfully', 
            filePath,
            dateRange: {
                startDate,
                endDate
            }
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get report data for display in the frontend
 */
exports.getReportData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const data = await getReportData(startDate, endDate);
        res.json(data);
    } catch (error) {
        console.error('Error fetching report data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get document status summary by month
 */
exports.getDocumentStatusByMonth = async (req, res) => {
    try {
        const data = await getDocumentStatusByMonth();
        res.json(data);
    } catch (error) {
        console.error('Error fetching document status by month:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get clients with pending documents for a specific month
 */
exports.getClientsPendingDocuments = async (req, res) => {
    try {
        const { month } = req.params;
        
        if (!month) {
            return res.status(400).json({ error: 'Month parameter is required' });
        }
        
        const data = await getClientsPendingDocuments(month);
        res.json(data);
    } catch (error) {
        console.error('Error fetching clients with pending documents:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Download the latest generated report
 */
exports.downloadReport = (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let fileName = 'HPRT_Report';
        
        if (startDate && endDate) {
            fileName = `HPRT_Report_${startDate}_to_${endDate}`;
        } else if (startDate) {
            fileName = `HPRT_Report_from_${startDate}`;
        } else if (endDate) {
            fileName = `HPRT_Report_to_${endDate}`;
        }
        
        const filePath = path.join(process.cwd(), 'reports', 'monthly_report.pdf');
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                error: 'Report not found. Please generate it first.' 
            });
        }
        
        res.download(filePath, `${fileName}.pdf`);
    } catch (error) {
        console.error('Error downloading report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Download report data as CSV
 */
exports.downloadReportCSV = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let fileName = 'HPRT_Monthly_Report';
        
        if (startDate && endDate) {
            // Format dates for filename in YYYY-MM-DD format
            fileName = `HPRT_Monthly_Report_${startDate}_to_${endDate}`;
        } else if (startDate) {
            fileName = `HPRT_Monthly_Report_from_${startDate}`;
        } else if (endDate) {
            fileName = `HPRT_Monthly_Report_to_${endDate}`;
        }
        
        // Get the report data
        const reportData = await getReportData(startDate, endDate);
        
        if (!reportData || reportData.length === 0) {
            return res.status(404).json({ 
                error: 'No report data found for the selected date range.' 
            });
        }
        
        // Helper function to format date in DD/MM/YYYY format
        const formatDateToDDMMYYYY = (dateString) => {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return '';
                
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                
                return `${day}/${month}/${year}`;
            } catch (error) {
                console.error('Error formatting date:', error);
                return '';
            }
        };
        
        // Prepare data for CSV conversion with dates in DD/MM/YYYY format
        const cleanData = reportData.map(doc => ({
            client_name: doc.client_name || '',
            document_month: doc.document_month || '',
            gst_filing_type: doc.gst_filing_type || '',
            gst_number: doc.gst_number || '',
            gst_1_status: doc.gst_1_enabled ? (doc.gst_1_received ? 'Received' : 'Pending') : 'Not Required',
            gst_1_date: doc.gst_1_enabled && doc.gst_1_received && doc.gst_1_received_date 
                ? formatDateToDDMMYYYY(doc.gst_1_received_date) : '',
            bank_statement_status: doc.bank_statement_enabled ? (doc.bank_statement_received ? 'Received' : 'Pending') : 'Not Required',
            bank_statement_date: doc.bank_statement_enabled && doc.bank_statement_received && doc.bank_statement_received_date 
                ? formatDateToDDMMYYYY(doc.bank_statement_received_date) : '',
            tds_status: doc.tds_document_enabled ? (doc.tds_received ? 'Received' : 'Pending') : 'Not Required',
            tds_date: doc.tds_document_enabled && doc.tds_received && doc.tds_received_date 
                ? formatDateToDDMMYYYY(doc.tds_received_date) : '',
            notes: doc.notes || ''
        }));
        
        // Add XML Excel header for wide columns
        const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="200"/>
  </Table>
 </Worksheet>
</Workbook>`;
        
        // Create CSV header row with added spaces to make columns wider in Excel
        const csvHeader = 'Client Name                                   ,Month                          ,GST Type                        ,GST Number                              ,GST Status                     ,GST Date                        ,Bank Statement Status                                    ,Bank Statement Date                   ,TDS Status                     ,TDS Date                        ,Notes\n';
        
        // Create CSV rows with padding for better display
        const csvRows = cleanData.map(row => {
            return [
                `"${row.client_name}"`,
                `"${row.document_month}"`,
                `"${row.gst_filing_type}"`,
                `"${row.gst_number}"`,
                `"${row.gst_1_status}"`,
                `"${row.gst_1_date}"`,
                `"${row.bank_statement_status}"`,
                `"${row.bank_statement_date}"`,
                `"${row.tds_status}"`,
                `"${row.tds_date}"`,
                `"${(row.notes || '').replace(/"/g, '""')}"`  // Escape quotes in notes
            ].join(',');
        }).join('\n');
        
        // Create the complete CSV content with separator hint for Excel
        const csvContent = `sep=,\nHPRT Monthly Report (${startDate || ''} to ${endDate || ''})\nGenerated on: ${formatDateToDDMMYYYY(new Date())}\n\n${csvHeader}${csvRows}`;
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}.csv`);
        
        res.send(csvContent);
    } catch (error) {
        console.error('Error downloading report as CSV:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 