
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportButtonProps {
    targetId: string;
}

export default function ExportButton({ targetId }: ExportButtonProps) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        const element = document.getElementById(targetId);
        if (!element) return;

        setExporting(true);
        try {
            // 1. CLONE the element to capture FULL content (even overflow)
            const clone = element.cloneNode(true) as HTMLElement;
            clone.style.height = 'auto';
            clone.style.overflow = 'visible';
            clone.style.width = '1000px'; // Fixed width for A4 consistency
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.background = '#000000'; // Force dark background
            clone.style.color = '#ffffff'; // Force white text

            // Append clone to body to render it
            document.body.appendChild(clone);

            // 2. Capture canvas of the CLONE
            const canvas = await html2canvas(clone, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: '#000000',
                windowWidth: 1000, // Match clone width
            });

            // Clean up clone
            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/png');

            // 3. Generate PDF (Paginated)
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Title Page
            pdf.setFontSize(18);
            pdf.setTextColor(40, 40, 40);
            pdf.text('BizNexus Analysis Report', 10, 15);
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 22);

            position = 30; // Start below title

            // Add first slice
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - position);

            // Add remaining pages
            while (heightLeft > 0) {
                position = position - pageHeight; // Move image up
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('BizNexus-Full-Report.pdf');
        } catch (error) {
            console.error("Export failed", error);
            alert("Export failed");
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
            <Download size={14} />
            {exporting ? 'Exporting...' : 'Export PDF'}
        </button>
    );
}
