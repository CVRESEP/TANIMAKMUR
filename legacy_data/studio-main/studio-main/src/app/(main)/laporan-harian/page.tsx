
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Loader2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { id } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';

import { generateDailyReportData } from "@/services/laporanHarianService";
import type { ReportData } from "@/services/laporanHarianService";


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}


export default function LaporanHarianPage() {
    const { toast } = useToast();
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [selectedKabupaten, setSelectedKabupaten] = React.useState("SEMUA");
    const [reportData, setReportData] = React.useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [hasFetchedData, setHasFetchedData] = React.useState(false);

    const kabupatenOptions = ["SEMUA", "MAGETAN", "SRAGEN"];

    const fetchDataForDate = async (selectedDate: Date, kabupaten: string) => {
        setIsLoading(true);
        setReportData(null);
        try {
            const data = await generateDailyReportData(selectedDate, kabupaten);
            setReportData(data);
        } catch (error) {
            console.error("Failed to fetch daily data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal memuat data laporan." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleShowData = () => {
        if (date) {
            setHasFetchedData(true);
            fetchDataForDate(date, selectedKabupaten);
        }
    }

    const handleExportXlsx = () => {
        if (!reportData || !date) return;

        const { productRows, productTotals, financialSummary } = reportData;

        // Create worksheet for product data
        const wsData = [
            ["LAPORAN HARIAN TANI MAKMUR"],
            [`TANGGAL: ${format(date, "dd MMMM yyyy", { locale: id })}`],
            [`KABUPATEN: ${toTitleCase(selectedKabupaten)}`],
            [],
            ["PRODUK", "SISA LALU", "PENYALURAN", "PENEBUSAN TUNAI", "STOK AKHIR", "HARGA TEBUS", "HARGA STOK", "HARGA JUAL", "JUAL KE KIOS", "PENEBUSAN"]
        ];

        productRows.forEach(row => {
            wsData.push([row.produk, row.sisaLalu, row.penyaluran, row.penebusanTunai, row.stokAkhir, row.hargaTebus, row.hargaStok, row.hargaJual, row.jualKeKios, row.penebusan]);
        });
        
        wsData.push(["TOTAL", productTotals.sisaLalu, productTotals.penyaluran, productTotals.penebusanTunai, productTotals.stokAkhir, '', productTotals.hargaStok, '', productTotals.jualKeKios, productTotals.penebusan]);

        // Add financial summary
        wsData.push(
            [], [],
            ["", "", "", "", "", "", "SISA TAGIHAN LALU", financialSummary.sisaTagihanLalu],
            ["", "", "", "", "", "", "PENJUALAN", financialSummary.penjualan],
            ["", "", "", "", "", "", "TOTAL", financialSummary.totalTagihan],
            ["", "", "", "", "", "", "PEMBAYARAN", financialSummary.pembayaran],
            ["", "", "", "", "", "", "SISA TAGIHAN HARI INI", financialSummary.sisaTagihanHariIni],
            ["", "", "", "", "", "", "SISA PUPUK", financialSummary.sisaPupuk],
            ["", "", "", "", "", "", "TOTAL TAGIHAN DAN PUPUK", financialSummary.totalTagihanDanPupuk],
        );
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Harian");
        XLSX.writeFile(wb, `Laporan Harian - ${format(date, "yyyy-MM-dd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!reportData || !date) return;

        const { productRows, productTotals, financialSummary } = reportData;
        const doc = new jsPDF() as jsPDFWithAutoTable;

        doc.text("LAPORAN HARIAN TANI MAKMUR", 14, 16);
        doc.setFontSize(10);
        doc.text(`TANGGAL: ${format(date, "dd MMMM yyyy", { locale: id })}`, 14, 22);
        doc.text(`KABUPATEN: ${toTitleCase(selectedKabupaten)}`, 14, 28);

        // Product Table
        doc.autoTable({
            startY: 35,
            head: [['PRODUK', 'SISA LALU', 'PENYALURAN', 'PENEBUSAN', 'STOK AKHIR', 'HARGA STOK', 'JUAL KE KIOS', 'PENEBUSAN']],
            body: productRows.map(row => [
                row.produk,
                row.sisaLalu.toFixed(2),
                row.penyaluran.toFixed(2),
                row.penebusanTunai.toFixed(2),
                row.stokAkhir.toFixed(2),
                formatCurrency(row.hargaStok),
                formatCurrency(row.jualKeKios),
                formatCurrency(row.penebusan)
            ]),
            foot: [[
                productTotals.produk,
                productTotals.sisaLalu.toFixed(2),
                productTotals.penyaluran.toFixed(2),
                productTotals.penebusanTunai.toFixed(2),
                productTotals.stokAkhir.toFixed(2),
                formatCurrency(productTotals.hargaStok),
                formatCurrency(productTotals.jualKeKios),
                formatCurrency(productTotals.penebusan)
            ]],
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] },
            footStyles: { fillColor: [211, 211, 211], textColor: [0,0,0], fontStyle: 'bold' },
        });

        // Financial Summary Table
        const finalY = doc.autoTable.previous.finalY;
        doc.autoTable({
            startY: finalY + 10,
            body: [
                ['SISA TAGIHAN LALU', formatCurrency(financialSummary.sisaTagihanLalu)],
                ['PENJUALAN', formatCurrency(financialSummary.penjualan)],
                ['TOTAL', formatCurrency(financialSummary.totalTagihan)],
                ['PEMBAYARAN', formatCurrency(financialSummary.pembayaran)],
                ['SISA TAGIHAN HARI INI', formatCurrency(financialSummary.sisaTagihanHariIni)],
                ['SISA PUPUK', formatCurrency(financialSummary.sisaPupuk)],
                ['TOTAL TAGIHAN DAN PUPUK', formatCurrency(financialSummary.totalTagihanDanPupuk)],
            ],
            theme: 'plain',
            columnStyles: {
                0: { fontStyle: 'bold', halign: 'right' },
                1: { halign: 'right' }
            },
            didParseCell: (data) => {
                if (data.row.index >= 4) { // Style last 3 rows
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        doc.save(`Laporan Harian - ${format(date, "yyyy-MM-dd")}.pdf`);
    };

    React.useEffect(() => {
        if (date && hasFetchedData) {
            fetchDataForDate(date, selectedKabupaten);
        }
    }, [date, selectedKabupaten, hasFetchedData]);

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Laporan Harian</CardTitle>
                        <CardDescription>Pilih tanggal dan kabupaten laporan yang ingin Anda lihat.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className="w-[240px] justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Select value={selectedKabupaten} onValueChange={setSelectedKabupaten}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="PILIH KABUPATEN" />
                            </SelectTrigger>
                            <SelectContent>
                                {kabupatenOptions.map(kab => <SelectItem key={kab} value={kab}>{toTitleCase(kab)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleShowData} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Tampilkan Data
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" disabled={!reportData || isLoading}>
                                EXPORT
                                <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={handleExportXlsx}>EXCEL</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPdf}>PDF</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex items-center justify-center h-96">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !hasFetchedData ? (
                        <div className="flex items-center justify-center h-96">
                             <p className="text-muted-foreground">Klik "Tampilkan Data" untuk melihat laporan.</p>
                        </div>
                    ) : reportData ? (
                        <div className="space-y-6">
                           <div className="border rounded-lg overflow-x-auto">
                             <Table>
                               <TableHeader>
                                 <TableRow>
                                   <TableHead>PRODUK</TableHead>
                                   <TableHead>SISA LALU</TableHead>
                                   <TableHead>PENYALURAN</TableHead>
                                   <TableHead>PENEBUSAN TUNAI</TableHead>
                                   <TableHead>STOK AKHIR</TableHead>
                                   <TableHead>HARGA TEBUS</TableHead>
                                   <TableHead>HARGA STOK</TableHead>
                                   <TableHead>HARGA JUAL</TableHead>
                                   <TableHead>JUAL KE KIOS</TableHead>
                                   <TableHead>PENEBUSAN</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {reportData.productRows.map((row) => (
                                   <TableRow key={row.produk}>
                                     <TableCell className="font-medium">{row.produk}</TableCell>
                                     <TableCell>{row.sisaLalu.toFixed(2)}</TableCell>
                                     <TableCell>{row.penyaluran.toFixed(2)}</TableCell>
                                     <TableCell>{row.penebusanTunai.toFixed(2)}</TableCell>
                                     <TableCell>{row.stokAkhir.toFixed(2)}</TableCell>
                                     <TableCell>{formatCurrency(row.hargaTebus)}</TableCell>
                                     <TableCell>{formatCurrency(row.hargaStok)}</TableCell>
                                     <TableCell>{formatCurrency(row.hargaJual)}</TableCell>
                                     <TableCell>{formatCurrency(row.jualKeKios)}</TableCell>
                                     <TableCell>{formatCurrency(row.penebusan)}</TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                               <TableFooter>
                                   <TableRow>
                                       <TableCell className="font-bold">{reportData.productTotals.produk}</TableCell>
                                       <TableCell className="font-bold">{reportData.productTotals.sisaLalu.toFixed(2)}</TableCell>
                                       <TableCell className="font-bold">{reportData.productTotals.penyaluran.toFixed(2)}</TableCell>
                                       <TableCell className="font-bold">{reportData.productTotals.penebusanTunai.toFixed(2)}</TableCell>
                                       <TableCell className="font-bold">{reportData.productTotals.stokAkhir.toFixed(2)}</TableCell>
                                       <TableCell></TableCell>
                                       <TableCell className="font-bold">{formatCurrency(reportData.productTotals.hargaStok)}</TableCell>
                                       <TableCell></TableCell>
                                       <TableCell className="font-bold">{formatCurrency(reportData.productTotals.jualKeKios)}</TableCell>
                                       <TableCell className="font-bold">{formatCurrency(reportData.productTotals.penebusan)}</TableCell>
                                   </TableRow>
                               </TableFooter>
                             </Table>
                           </div>
                           <div className="flex justify-end">
                                <div className="w-full max-w-md">
                                    <Table>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium text-right">SISA TAGIHAN LALU</TableCell>
                                                <TableCell className="text-right">{formatCurrency(reportData.financialSummary.sisaTagihanLalu)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-right">PENJUALAN</TableCell>
                                                <TableCell className="text-right">{formatCurrency(reportData.financialSummary.penjualan)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-right">TOTAL</TableCell>
                                                <TableCell className="text-right">{formatCurrency(reportData.financialSummary.totalTagihan)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-right">PEMBAYARAN</TableCell>
                                                <TableCell className="text-right">{formatCurrency(reportData.financialSummary.pembayaran)}</TableCell>
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="font-medium text-right">SISA TAGIHAN HARI INI</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(reportData.financialSummary.sisaTagihanHariIni)}</TableCell>
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="font-medium text-right">SISA PUPUK</TableCell>
                                                <TableCell className="text-right">{formatCurrency(reportData.financialSummary.sisaPupuk)}</TableCell>
                                            </TableRow>
                                             <TableRow className="bg-muted">
                                                <TableCell className="font-medium text-right">TOTAL TAGIHAN DAN PUPUK</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(reportData.financialSummary.totalTagihanDanPupuk)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                           </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-96">
                            <p className="text-muted-foreground">Tidak ada data untuk tanggal yang dipilih.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

    