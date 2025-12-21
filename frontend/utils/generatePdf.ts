
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePdf = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        // 1. Clone the specific message content
        const clone = element.cloneNode(true) as HTMLElement;

        // 2. Apply "Executive Report" Styling to the clone
        // Reset positioning and width
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.width = '1000px'; // Fixed A4-compatible width
        clone.style.height = 'auto'; // Full height

        // Visual Style: Clean White Paper
        clone.style.backgroundColor = '#ffffff';
        clone.style.color = '#000000';
        clone.style.fontFamily = 'Arial, sans-serif';
        clone.style.padding = '40px';
        clone.style.border = 'none';
        clone.style.borderRadius = '0';
        clone.style.boxShadow = 'none';

        // Fix Text Colors explicitly (override Tailwind dark mode text-white)
        const allElements = clone.querySelectorAll('*');
        allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
                // If it was white text, make it black/gray
                const style = window.getComputedStyle(el);
                if (style.color === 'rgb(255, 255, 255)' || style.color === '#ffffff') {
                    el.style.color = '#333333';
                }
                // Handle bold/headings
                if (el.tagName === 'STRONG' || el.tagName === 'H3' || el.tagName === 'H4') {
                    el.style.color = '#111111';
                }
                // Remove borders designed for dark mode
                if (style.borderColor === 'rgba(255, 255, 255, 0.1)') {
                    el.style.borderColor = '#ddd';
                }
                if (el.tagName === 'HR') {
                    el.style.borderColor = '#ddd';
                }
            }
        });

        // 3. Add Header to Clone
        const header = document.createElement('div');
        header.innerHTML = `
            <div style="border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px;">
                <h1 style="font-size: 24px; font-weight: bold; color: #000; margin: 0;">BizNexus Executive Report</h1>
                <p style="font-size: 12px; color: #666; margin-top: 5px;">Generated: ${new Date().toLocaleString()}</p>
            </div>
        `;
        clone.insertBefore(header, clone.firstChild);

        document.body.appendChild(clone);

        // 4. Capture
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
            // We use standard white bg interpretation
        });

        document.body.removeChild(clone);
        const imgData = canvas.toDataURL('image/png');

        // 5. PDF Generation (Paginated)
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = position - pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('BizNexus_Structure_Report.pdf');

    } catch (e) {
        console.error("PDF Gen Error", e);
        alert("Could not generate PDF");
    }
};
