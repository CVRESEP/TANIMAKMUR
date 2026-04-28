
"use client";

import * as React from "react";
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableHeader,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUp, PlusCircle, Search, Trash2, Pencil, ChevronDown, Repeat, Truck, DollarSign, AlertCircle, Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate, toInputDate, parseCurrency, toTitleCase } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPenyaluranKios, addPenyaluranKios, updatePenyaluranKios, deletePenyaluranKios, addPenyaluranKiosBatch } from "@/services/penyaluranKiosService";
import { getPembayaran } from "@/services/pembayaranService";
import { getPengeluaranDo } from "@/services/pengeluaranDoService";
import { getPenebusan } from "@/services/penebusanService";
import { getProducts } from "@/services/productService";
import { getKiosks } from "@/services/kioskService";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Combobox } from "@/components/ui/combobox";
import { DateFilter } from "@/components/ui/date-filter";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";


const FormComponent = ({ item, onSave, onCancel, allData }: { item?: any, onSave: (item: any) => void, onCancel: () => void, allData: any }) => {
    const { toast } = useToast();
    const { pengeluaranDoData = [], penyaluranKiosData = [], penebusanData = [], productsData = [], kiosksData = [] } = allData || {};
    
    const [formData, setFormData] = React.useState({
        noDo: "",
        nomorPenyaluran: "",
        tanggal: new Date().toISOString().split('T')[0],
        kabupaten: "",
        namaProduk: "",
        namaKios: "",
        namaSopir: "",
        qty: 0,
        total: 0,
        diBayar: 0,
        keterangan: "",
        ...item,
    });

    const sisaDo = React.useMemo(() => {
        if (!formData.noDo || !pengeluaranDoData) return 0;
        const pengeluaran = pengeluaranDoData.find((p:any) => p.id === formData.noDo);
        const totalPenyaluranExisting = (penyaluranKiosData || [])
            .filter((p:any) => p.noDo === formData.noDo && p.id !== formData.id)
            .reduce((sum:number, p:any) => sum + p.qty, 0);
        return pengeluaran ? pengeluaran.qty - totalPenyaluranExisting : 0;
    }, [formData.noDo, formData.id, pengeluaranDoData, penyaluranKiosData]);
    
    React.useEffect(() => {
        if (item) {
            setFormData(prev => ({ ...prev, ...item, tanggal: toInputDate(item.tanggal) || new Date().toISOString().split('T')[0] }));
        }
    }, [item]);

    React.useEffect(() => {
        const { diBayar, total } = formData;
        if (total > 0) {
             setFormData(prev => ({
                ...prev,
                keterangan: diBayar >= total ? "LUNAS" : "BELUM LUNAS"
            }));
        }
    }, [formData.diBayar, formData.total]);

    React.useEffect(() => {
        const { qty, namaProduk } = formData;
        if (namaProduk && qty > 0 && productsData) {
            const product = productsData.find((p:any) => p.productName === namaProduk);
            if (product) {
                setFormData(prev => ({ ...prev, total: qty * product.hargaJual }));
            }
        } else {
            setFormData(prev => ({ ...prev, total: 0 }));
        }
    }, [formData.qty, formData.namaProduk, productsData]);

    const handleNoDoChange = (noDo: string) => {
        if (!penebusanData) return;
        const penebusan = penebusanData.find((p:any) => p.noDo === noDo);
        if (penebusan) {
            
            let nomorPenyaluran = formData.nomorPenyaluran;
            if (!item?.id) { // Only generate for new items
                const count = penyaluranKiosData.filter((p:any) => p.noDo === noDo).length;
                nomorPenyaluran = `${noDo}-${count + 1}`;
            }

            setFormData(prev => ({
                ...prev,
                noDo,
                nomorPenyaluran: nomorPenyaluran,
                kabupaten: penebusan.kabupaten,
                namaProduk: penebusan.namaProduk,
                namaKios: "", // Reset kios
            }));
        } else {
             setFormData(prev => ({ ...prev, noDo }));
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isNumericOrCurrency = ['qty', 'total', 'diBayar'].includes(name);
        setFormData(prev => ({ 
            ...prev, 
            [name]: isNumericOrCurrency ? (name === 'qty' ? Number(value) : parseCurrency(value)) : value.toUpperCase()
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.namaKios) {
            toast({
                variant: "destructive",
                title: "VALIDASI GAGAL",
                description: "NAMA KIOS WAJIB DIISI. DATA TIDAK DISIMPAN.",
            });
            return;
        }

        if (!formData.namaSopir) {
            toast({
                variant: "destructive",
                title: "VALIDASI GAGAL",
                description: "NAMA SOPIR WAJIB DIISI. DATA TIDAK DISIMPAN.",
            });
            return;
        }

        if (formData.qty > sisaDo) {
            toast({
                variant: "destructive",
                title: "VALIDASI GAGAL",
                description: `QTY (${formData.qty}) MELEBIHI SISA DO (${sisaDo}). DATA TIDAK DISIMPAN.`,
            });
            return;
        }
        onSave(formData);
    };
    
    const handleLunasClick = () => {
        setFormData(prev => ({ ...prev, diBayar: prev.total }));
    };

    const kiosOptions = React.useMemo(() => {
        if (!formData.kabupaten || !kiosksData) return [];
        const filteredKiosks = kiosksData.filter((k: any) => k.kabupaten === formData.kabupaten);
        const uniqueKioskNames = [...new Set(filteredKiosks.map((k: any) => k.name))];
        return uniqueKioskNames.map(name => ({ value: name, label: name }));
    }, [formData.kabupaten, kiosksData]);
    
    const noDoOptions = React.useMemo(() => {
        if (!pengeluaranDoData) return [];
        const options = pengeluaranDoData.map((p: any) => p.id);
        const uniqueOptions = [...new Set(options)];
        return uniqueOptions.map(opt => ({ value: opt, label: opt }));
    }, [pengeluaranDoData]);

    const sopirOptions = React.useMemo(() => {
        if (!penyaluranKiosData) return [];
        const sopirNames = penyaluranKiosData
          .map((p: any) => p.namaSopir)
          .filter((name: string) => name && name.trim() !== '');
        const uniqueSopirNames = [...new Set(sopirNames)];
        return uniqueSopirNames.map(name => ({ value: name, label: name }));
      }, [penyaluranKiosData]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                    <Label htmlFor="noDo">NO DO</Label>
                    <Combobox
                        options={noDoOptions}
                        value={formData.noDo}
                        onChange={(value) => handleNoDoChange(value)}
                        placeholder="PILIH NO DO"
                        searchPlaceholder="CARI NO DO..."
                        emptyPlaceholder="NO DO TIDAK DITEMUKAN"
                    />
                </div>
                <div>
                    <Label htmlFor="nomorPenyaluran">NO PENYALURAN</Label>
                    <Input id="nomorPenyaluran" name="nomorPenyaluran" value={formData.nomorPenyaluran} readOnly />
                </div>
                <div><Label htmlFor="tanggal">TANGGAL</Label><Input id="tanggal" name="tanggal" type="date" value={toInputDate(formData.tanggal)} onChange={handleChange} required /></div>
                <div><Label htmlFor="kabupaten">KABUPATEN</Label><Input id="kabupaten" name="kabupaten" value={formData.kabupaten} required readOnly /></div>
                <div><Label htmlFor="namaProduk">NAMA PRODUK</Label><Input id="namaProduk" name="namaProduk" value={formData.namaProduk} required readOnly /></div>
                <div>
                    <Label htmlFor="namaKios">NAMA KIOS</Label>
                    <Combobox
                        options={kiosOptions}
                        value={formData.namaKios}
                        onChange={(value) => handleSelectChange('namaKios', value)}
                        placeholder="PILIH NAMA KIOS"
                        searchPlaceholder="CARI NAMA KIOS..."
                        emptyPlaceholder="NAMA KIOS TIDAK DITEMUKAN"
                        disabled={!formData.kabupaten}
                    />
                </div>
                <div>
                    <Label htmlFor="namaSopir">NAMA SOPIR</Label>
                    <Combobox
                        options={sopirOptions}
                        value={formData.namaSopir}
                        onChange={(value) => handleSelectChange('namaSopir', value)}
                        placeholder="PILIH ATAU KETIK NAMA SOPIR"
                        searchPlaceholder="CARI NAMA SOPIR..."
                        emptyPlaceholder="NAMA SOPIR TIDAK DITEMUKAN"
                        allowCustomValue
                    />
                </div>
                <div><Label htmlFor="qty">QTY (TON)</Label><Input id="qty" name="qty" type="number" value={formData.qty} onChange={handleChange} required max={sisaDo} /></div>
                <div><Label htmlFor="total">TOTAL</Label><Input id="total" name="total" value={formatCurrency(formData.total)} readOnly /></div>
                <div>
                    <Label htmlFor="diBayar">DI BAYAR</Label>
                    <Input id="diBayar" name="diBayar" value={formatCurrency(formData.diBayar)} onChange={handleChange} />
                    <Button type="button" variant="link" className="p-0 h-auto text-xs mt-1" onClick={handleLunasClick}>
                        LUNAS
                    </Button>
                </div>
                <div><Label htmlFor="keterangan">KETERANGAN</Label><Input id="keterangan" name="keterangan" value={formData.keterangan} readOnly /></div>
            </div>
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={onCancel}>BATAL</Button>
                <Button type="submit">SIMPAN</Button>
            </DialogFooter>
        </form>
    );
};

const ImportDialog = ({ onImport, onCancel }: { onImport: (file: File) => void, onCancel: () => void }) => {
    const [file, setFile] = React.useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleImportClick = () => {
        if (file) {
            onImport(file);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>IMPORT DATA PENYALURAN KIOS</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="file">PILIH FILE EXCEL (.XLSX)</Label>
                <Input id="file" type="file" accept=".xlsx" onChange={handleFileChange} />
                <p className="text-sm text-muted-foreground mt-2">
                    Pastikan urutan kolom: `NO DO`, `TANGGAL`, `KABUPATEN`, `NAMA PRODUK`, `NAMA KIOS`, `NAMA SOPIR`, `QTY`, `DI BAYAR`. Header akan diabaikan.
                </p>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={onCancel}>BATAL</Button>
                <Button onClick={handleImportClick} disabled={!file}>IMPORT</Button>
            </DialogFooter>
        </DialogContent>
    );
};

const SpjDialog = ({ item, onPrint, onCancel }: { item: any | null, onPrint: (spj: string) => void, onCancel: () => void }) => {
    const [spj, setSpj] = React.useState('');

    return (
        <Dialog open={!!item} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>MASUKKAN NOMOR SPJ</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="spj">NOMOR SPJ</Label>
                    <Input id="spj" value={spj} onChange={(e) => setSpj(e.target.value)} placeholder="Contoh: 295" />
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={onCancel}>BATAL</Button>
                    <Button onClick={() => onPrint(spj)} disabled={!spj}>CETAK</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function PenyaluranKiosPage() {
    const { toast } = useToast();
    const [data, setData] = React.useState<any[]>([]);
    const [pembayaranData, setPembayaranData] = React.useState<any[]>([]);
    const [allDataForForm, setAllDataForForm] = React.useState<any>({});
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedKabupaten, setSelectedKabupaten] = React.useState("SEMUA");
    const [dateFilteredData, setDateFilteredData] = React.useState<any[]>([]);
    const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<any | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [hasFetchedData, setHasFetchedData] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(25);
    const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
    const [itemToPrint, setItemToPrint] = React.useState<any | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [processedPenyaluran, pembayaran, pengeluaranDo, penebusan, products, kiosks] = await Promise.all([
                getPenyaluranKios(),
                getPembayaran(),
                getPengeluaranDo(),
                getPenebusan(),
                getProducts(),
                getKiosks(),
            ]);
            setData(processedPenyaluran);
            setPembayaranData(pembayaran);
            setAllDataForForm({
                pengeluaranDoData: pengeluaranDo,
                penyaluranKiosData: processedPenyaluran,
                penebusanData: penebusan,
                productsData: products,
                kiosksData: kiosks
            });
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal memuat data." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleShowData = () => {
        setHasFetchedData(true);
        fetchData();
    };

    const penyaluranDataWithDetails = React.useMemo(() => {
        if (!data || !pembayaranData) return [];
        return data.map(item => {
            const totalPembayaranTempo = pembayaranData
                .filter(p => p.nomorPenyaluran === item.nomorPenyaluran)
                .reduce((sum, p) => sum + p.totalBayar, 0);
            
            const totalBayar = (item.diBayar || 0) + totalPembayaranTempo;
            const kurangBayar = item.total - totalBayar;

            return {
                ...item,
                totalPembayaranTempo,
                kurangBayar,
                keterangan: kurangBayar <= 0 ? "LUNAS" : "BELUM LUNAS"
            };
        });
    }, [data, pembayaranData]);
    
    const kabupatenOptions = ["SEMUA", "MAGETAN", "SRAGEN"];

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
          setSelectedRows(paginatedData.map((item) => item.id));
        } else {
          setSelectedRows([]);
        }
      };
    
      const handleSelectRow = (id: string) => {
        setSelectedRows((prev) =>
          prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
      };

    const handleDelete = async () => {
        const originalData = [...data];
        const itemsToDelete = data.filter(item => selectedRows.includes(item.id));

        setData(prev => prev.filter(item => !selectedRows.includes(item.id)));
        setSelectedRows([]);
        
        try {
            await deletePenyaluranKios(selectedRows);
            toast({ title: "Sukses", description: `${itemsToDelete.length} data berhasil dihapus.` });
        } catch (error) {
            setData(originalData);
            console.error("Failed to delete data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menghapus data. Mengembalikan perubahan." });
        }
    };
    
    const handleSave = async (item: any) => {
        const isEditing = !!item.id;
        const originalData = [...data];
        
        setIsAddDialogOpen(false);
        setEditingItem(null);

        try {
            if (isEditing) {
                await updatePenyaluranKios(item.id, item);
                toast({ title: "Sukses", description: "Data berhasil diperbarui." });
            } else {
                await addPenyaluranKios(item);
                toast({ title: "Sukses", description: "Data berhasil ditambahkan." });
            }
            fetchData();
        } catch (error) {
            setData(originalData);
            console.error("Failed to save data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data." });
        }
    };
    
    const handleImport = async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

                const dataRows = json.slice(1);
                
                const products = allDataForForm.productsData || await getProducts();

                const newPenyaluran = dataRows.map(row => {
                    let tanggal = "";
                    if (row[1] instanceof Date) {
                        tanggal = row[1].toISOString().split('T')[0];
                    } else if (typeof row[1] === 'string') {
                        tanggal = toInputDate(row[1]);
                    }

                    const namaProduk = String(row[3] || '').toUpperCase();
                    const qty = Number(row[6] || 0);
                    const product = products.find((p:any) => p.productName === namaProduk);
                    const total = product ? qty * product.hargaJual : 0;
                    const diBayar = Number(row[7] || 0);

                    return {
                        noDo: String(row[0] || '').toUpperCase(),
                        tanggal,
                        kabupaten: String(row[2] || '').toUpperCase(),
                        namaProduk,
                        namaKios: String(row[4] || '').toUpperCase(),
                        namaSopir: String(row[5] || '').toUpperCase(),
                        qty,
                        diBayar,
                        total,
                        keterangan: diBayar >= total ? "LUNAS" : "BELUM LUNAS",
                    }
                }).filter(p => p.noDo && p.tanggal && p.namaKios);
                
                if (newPenyaluran.length > 0) {
                    await addPenyaluranKiosBatch(newPenyaluran);
                    toast({ title: "Sukses", description: `${newPenyaluran.length} data berhasil diimpor. Memuat ulang data...` });
                    fetchData(); // Refresh all data
                } else {
                     toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data valid untuk diimpor." });
                }
            } catch (error) {
                console.error("Failed to import data:", error);
                toast({ variant: "destructive", title: "Error", description: "Gagal mengimpor data. Periksa format file." });
            } finally {
                setIsImportDialogOpen(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handlePrintMagetanReceipt = (item: any) => {
        const doc = new jsPDF({
            orientation: 'l',
            unit: 'cm',
            format: [15, 10.7]
        });

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text("TM", 1, 1.0);
        
        doc.setFontSize(8);
        doc.text("CV. TANI MAKMUR", 2.2, 0.7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text("DISTRIBUTOR PUPUK PT. PETRO KIMIA GRESIK", 2.2, 1.0);
        doc.text("Jl. Pendidikan No. 400 Sempol Maospati Magetan Jatim", 2.2, 1.3);
        doc.text("Telp. (0351) 864299, Fax. (0351) 865773", 2.2, 1.6);
        doc.text("E-mail : tnmakmur@gmail.com", 2.2, 1.9);

        doc.setLineWidth(0.05);
        doc.line(1, 2.3, 14, 2.3);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("TANDA TERIMA PUPUK", 7.5, 2.9, { align: 'center' });
        doc.setLineWidth(0.02);
        doc.line(5.5, 3.0, 9.5, 3.0);
        
        const productMap: { [key: string]: string } = {
            'UREA SUBSIDI': 'urea',
            'ZA SUBSIDI': 'za',
            'SP-36 SUBSIDI': 'sp36',
            'PHONSKA SUBSIDI': 'phonska',
            'PETROGANIK SUBSIDI': 'petroganik'
        };

        const tonase: any = { urea: '', za: '', sp36: '', phonska: '', petroganik: '' };
        const productKey = productMap[item.namaProduk];
        if (productKey) {
            tonase[productKey] = item.qty;
        }

        const tableData = [
            ['1', item.namaKios, tonase.urea, tonase.za, tonase.sp36, tonase.phonska, tonase.petroganik, item.qty],
        ];
        
        for (let i = 2; i <= 8; i++) {
            tableData.push([`${i}`, '', '', '', '', '', '', '']);
        }

        (doc as any).autoTable({
            startY: 3.27,
            head: [['NO', 'KIOS', 'UREA', 'ZA', 'SP-36', 'PHONSKA', 'PETROGANIK', 'TOTAL']],
            body: tableData,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 6,
                cellPadding: 0.05,
                lineWidth: 0.01,
                lineColor: [0, 0, 0],
                minCellHeight: 0.436,
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
                minCellHeight: 0.8,
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 0.7 },
                1: { cellWidth: 3.5 },
                2: { halign: 'center', cellWidth: 1.3 },
                3: { halign: 'center', cellWidth: 1.3 },
                4: { halign: 'center', cellWidth: 1.3 },
                5: { halign: 'center', cellWidth: 1.3 },
                6: { halign: 'center', cellWidth: 1.3 },
                7: { halign: 'center', cellWidth: 1.3 },
            },
            didDrawCell: (data: any) => {
                if (data.section === 'head' && data.column.index === 2) {
                    doc.setFontSize(6);
                    doc.text('TONASE', data.cell.x + 3.3, data.cell.y + 0.3, { align: 'center' });
                }
            }
        });
        
        const finalY = (doc as any).autoTable.previous.finalY;
        doc.setFontSize(8);
        doc.text(`MAGETAN, ${format(new Date(item.tanggal), 'dd MMMM yyyy', { locale: id })}`, 1, finalY + 0.8);
        doc.text("PENERIMA", 12, finalY + 0.8);
        doc.text("CV TANI MAKMUR", 1, finalY + 1.5);
        
        doc.line(1, finalY + 2.5, 4, finalY + 2.5);
        doc.line(12, finalY + 2.5, 14, finalY + 2.5);

        const fileName = `${item.nomorPenyaluran}-${item.namaKios}-${item.namaProduk}.pdf`;
        doc.autoPrint();
        const pdfOutput = doc.output('datauristring');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.title = fileName;
            printWindow.document.write(`<iframe width="100%" height="100%" src="${pdfOutput}"></iframe>`);
        }
    };

    const handlePrintSragenReceipt = (item: any, spj: string) => {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const { kiosksData } = allDataForForm;
        const kioskDetails = kiosksData.find((k: any) => k.name === item.namaKios);
        const hargaSatuan = item.qty > 0 ? item.total / item.qty : 0;
        
        let nopol = '';
        if (item.namaSopir === 'CATUR') {
            nopol = 'AE 8411 UP';
        } else if (item.namaSopir === 'TRIS') {
            nopol = 'AE 8913 UP';
        }
        
        // --- HEADER ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text("CV. TANI MAKMUR", 105, 20, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text("Ruko Perum Royal Amerta, Ds. Pilangsari, Ngrampal, Sragen", 105, 25, { align: 'center' });
        doc.text("Telepon. 0271-8825178, Fax. tnmakmur@gmail.com", 105, 30, { align: 'center' });
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("NOTA PUD (Pelaku Usaha Distribusi)", 105, 40, { align: 'center' });
        doc.setFontSize(10);
        doc.text("PENYALURAN PUPUK BERSUBSIDI PT PUPUK INDONESIA (Persero)", 105, 45, { align: 'center' });

        // --- RECIPIENT INFO ---
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const infoY = 55;
        doc.text("Kepada PPTS", 20, infoY);
        doc.text(":", 45, infoY);
        doc.text(item.namaKios || "", 48, infoY);

        doc.text("Alamat", 20, infoY + 5);
        doc.text(":", 45, infoY + 5);
        doc.text(kioskDetails ? `${kioskDetails.desa}, ${kioskDetails.kecamatan}, ${kioskDetails.kabupaten}`.toUpperCase() : "", 48, infoY + 5);

        doc.text("No. Tlp", 20, infoY + 10);
        doc.text(":", 45, infoY + 10);
        doc.text(kioskDetails?.nomorTelepon || "", 48, infoY + 10);

        doc.text("Tanggal", 20, infoY + 15);
        doc.text(":", 45, infoY + 15);
        doc.text("      , " + format(new Date(item.tanggal), 'MMMM yyyy', { locale: id }), 48, infoY + 15);
        
        doc.text("SPJ", 160, infoY + 15);
        doc.text(spj, 180, infoY + 15);

        const tableBody = [
            [
                item.noDo,
                item.namaProduk,
                item.qty,
                "Ton",
                formatCurrency(hargaSatuan),
                formatCurrency(item.total)
            ],
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
        ];

        // --- TABLE ---
        (doc as any).autoTable({
            startY: infoY + 25,
            head: [['NOMOR DO', 'JENIS PUPUK', 'QTY', 'SATUAN', 'HARGA (Rp / Ton)', 'JUMLAH (Rp)']],
            body: tableBody,
            foot: [['JUMLAH', '', item.qty, '', '', formatCurrency(item.total)]],
            theme: 'grid',
            headStyles: { 
                fillColor: [255, 255, 255], 
                textColor: [0, 0, 0], 
                lineWidth: 0.1, 
                lineColor: [0,0,0],
                fontSize: 10,
            },
            bodyStyles: { 
                fontStyle: 'bold', 
                lineWidth: 0.1, 
                lineColor: [0,0,0], 
                textColor: [0,0,0],
                fontSize: 9
            },
            footStyles: { 
                fontStyle: 'bold', 
                lineWidth: 0.1, 
                lineColor: [0,0,0], 
                textColor: [0,0,0],
                fontSize: 9,
                fillColor: [255, 255, 255],
            },
        });

        // --- FOOTER ---
        const finalY = (doc as any).autoTable.previous.finalY;
        doc.text("PPTS", 25, finalY + 7);
        doc.text("Expeditur", 105, finalY + 7, { align: 'center' });
        doc.text("PUD", 185, finalY + 7, { align: 'right' });
        doc.text(`No. Pol : ${nopol}`, 105, finalY + 12, { align: 'center' });
        
        doc.text(item.namaKios || "", 25, finalY + 30);
        doc.text(item.namaSopir || "", 105, finalY + 30, { align: 'center' });
        doc.text("SRI NURHAYATI", 185, finalY + 30, { align: 'right' });

        // --- NOTES ---
        doc.setFontSize(9);
        doc.text("- Nota ini juga berlaku sebagai SURAT JALAN", 25, finalY + 45);
        doc.text("- Nota ini juga berlaku sebagai Bukti Penyerahterimaan", 25, finalY + 50);
        doc.setFont('helvetica', 'bold');
        doc.text("- PERHATIAN UNTUK PEMBAYARAN HANYA DI REKENING MANDIRI", 25, finalY + 55);
        doc.text("- Transfer BANK MANDIRI a/n CV. TANI MAKMUR ( 171-00-157-63-686 )", 25, finalY + 60);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("1. PPTS  2. PUD 3. Expeditur", 185, finalY + 45, { align: 'right' });

        const fileName = `${item.nomorPenyaluran}-${item.namaKios}-${item.namaProduk}-SPJ${spj}.pdf`;
        doc.autoPrint();
        const pdfOutput = doc.output('datauristring');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.title = fileName;
            printWindow.document.write(`<iframe width="100%" height="100%" src="${pdfOutput}"></iframe>`);
        }
        setItemToPrint(null);
    };
    
    const handlePrintClick = (item: any) => {
        if (item.kabupaten === 'SRAGEN') {
            setItemToPrint(item);
        } else {
            handlePrintMagetanReceipt(item);
        }
    }

    const sortedData = React.useMemo(() => {
        let sortableItems = [...dateFilteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
    
                if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
                if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
    
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    if (aValue.toLowerCase() < bValue.toLowerCase()) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (aValue.toLowerCase() > bValue.toLowerCase()) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                } else {
                    if (aValue < bValue) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (aValue > bValue) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                }
                return 0;
            });
        } else {
            sortableItems.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        }
        return sortableItems;
    }, [dateFilteredData, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const filteredData = sortedData
        .filter(item => selectedKabupaten === "SEMUA" || item.kabupaten === selectedKabupaten)
        .filter((item) =>
            Object.values(item).some((val) =>
            String(val).toUpperCase().includes(searchTerm.toUpperCase())
        )
    );

    const totalPages = itemsPerPage > 0 ? Math.ceil(filteredData.length / itemsPerPage) : 1;

    const paginatedData = itemsPerPage > 0
        ? filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : filteredData;

    const totalTransaksi = filteredData.length;
    const totalQty = filteredData.reduce((sum, item) => sum + item.qty, 0);
    const totalPenjualan = filteredData.reduce((sum, item) => sum + item.total, 0);
    const totalKurangBayar = filteredData.reduce((sum, item) => sum + item.kurangBayar, 0);

    const handleExportXlsx = () => {
        const dataToExport = filteredData.map(item => ({
            'NO DO': item.noDo,
            'NO PENYALURAN': item.nomorPenyaluran,
            'TANGGAL': formatDate(item.tanggal),
            'KABUPATEN': item.kabupaten,
            'NAMA PRODUK': item.namaProduk,
            'NAMA KIOS': item.namaKios,
            'NAMA SOPIR': item.namaSopir,
            'QTY': item.qty,
            'TOTAL': item.total,
            'DI BAYAR': item.diBayar,
            'TOTAL BAYAR TEMPO': item.totalPembayaranTempo,
            'KURANG BAYAR': item.kurangBayar,
            'KETERANGAN': item.keterangan,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Penyaluran Kios");
        XLSX.writeFile(workbook, "Laporan_Penyaluran_Kios.xlsx");
    };

    const handleExportPdf = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text("Laporan Penyaluran Kios", 14, 16);
        (doc as any).autoTable({
            head: [['NO DO', 'NO PENYALURAN', 'TANGGAL', 'KABUPATEN', 'PRODUK', 'KIOS', 'SOPIR', 'QTY', 'TOTAL', 'DIBAYAR', 'KURANG BAYAR', 'KETERANGAN']],
            body: filteredData.map(item => [
                item.noDo,
                item.nomorPenyaluran,
                formatDate(item.tanggal),
                item.kabupaten,
                item.namaProduk,
                item.namaKios,
                item.namaSopir,
                item.qty,
                formatCurrency(item.total),
                formatCurrency(item.diBayar),
                formatCurrency(item.kurangBayar),
                item.keterangan
            ]),
            startY: 20,
        });
        doc.save('laporan_penyaluran_kios.pdf');
    };

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedKabupaten, dateFilteredData, itemsPerPage, sortConfig]);
    
    React.useEffect(() => {
        if (hasFetchedData) {
            setDateFilteredData(penyaluranDataWithDetails);
        }
    }, [penyaluranDataWithDetails, hasFetchedData]);


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL TRANSAKSI</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransaksi}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL QTY</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQty} Ton</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL PENJUALAN</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPenjualan)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL KURANG BAYAR</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalKurangBayar)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 pt-4">
        <div className="flex gap-2 items-center flex-wrap">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="CARI..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedKabupaten} onValueChange={setSelectedKabupaten}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="PILIH KABUPATEN" />
                </SelectTrigger>
                <SelectContent>
                    {kabupatenOptions.map(kab => <SelectItem key={kab} value={kab}>{toTitleCase(kab)}</SelectItem>)}
                </SelectContent>
            </Select>
            <DateFilter data={penyaluranDataWithDetails} onFilterChange={setDateFilteredData} />
            <Button onClick={handleShowData}>TAMPILKAN DATA</Button>
        </div>
        <div className="flex gap-2">
            {selectedRows.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            HAPUS ({selectedRows.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>APAKAH ANDA YAKIN?</AlertDialogTitle>
                        <AlertDialogDescription>
                            TINDAKAN INI TIDAK DAPAT DIBATALKAN. INI AKAN MENGHAPUS DATA YANG ANDA PILIH SECARA PERMANEN.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>BATAL</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>HAPUS</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <FileUp className="mr-2 h-4 w-4" />
                        IMPORT
                    </Button>
                </DialogTrigger>
                <ImportDialog onImport={handleImport} onCancel={() => setIsImportDialogOpen(false)} />
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  EXPORT
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportXlsx}>EXCEL</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isAddDialogOpen || !!editingItem} onOpenChange={(open) => { if (!open) { setIsAddDialogOpen(false); setEditingItem(null); }}}>
                <DialogTrigger asChild>
                    <Button onClick={() => { setEditingItem(null); setIsAddDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        TAMBAH DATA
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                    <DialogTitle>{editingItem ? 'EDIT' : 'TAMBAH'} DATA PENYALURAN KIOS</DialogTitle>
                    </DialogHeader>
                    <FormComponent 
                        item={editingItem} 
                        onSave={handleSave} 
                        onCancel={() => { setIsAddDialogOpen(false); setEditingItem(null); }}
                        allData={allDataForForm}
                    />
                </DialogContent>
            </Dialog>
        </div>
      </div>
      <div className="border shadow-sm rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
            <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedRows.length > 0 && selectedRows.length === paginatedData.length}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
              </TableHead>
              <TableHead>NO</TableHead>
              <SortableHeader sortKey="noDo" sortConfig={sortConfig} onSort={handleSort}>NO DO</SortableHeader>
              <SortableHeader sortKey="nomorPenyaluran" sortConfig={sortConfig} onSort={handleSort}>NO PENYALURAN</SortableHeader>
              <SortableHeader sortKey="tanggal" sortConfig={sortConfig} onSort={handleSort}>TANGGAL</SortableHeader>
              <SortableHeader sortKey="kabupaten" sortConfig={sortConfig} onSort={handleSort}>KABUPATEN</SortableHeader>
              <SortableHeader sortKey="namaProduk" sortConfig={sortConfig} onSort={handleSort}>NAMA PRODUK</SortableHeader>
              <SortableHeader sortKey="namaKios" sortConfig={sortConfig} onSort={handleSort}>NAMA KIOS</SortableHeader>
              <SortableHeader sortKey="namaSopir" sortConfig={sortConfig} onSort={handleSort}>NAMA SOPIR</SortableHeader>
              <SortableHeader sortKey="qty" sortConfig={sortConfig} onSort={handleSort}>QTY</SortableHeader>
              <SortableHeader sortKey="total" sortConfig={sortConfig} onSort={handleSort}>TOTAL</SortableHeader>
              <SortableHeader sortKey="diBayar" sortConfig={sortConfig} onSort={handleSort}>DI BAYAR</SortableHeader>
              <SortableHeader sortKey="totalPembayaranTempo" sortConfig={sortConfig} onSort={handleSort}>TOTAL BAYAR TEMPO</SortableHeader>
              <SortableHeader sortKey="kurangBayar" sortConfig={sortConfig} onSort={handleSort}>KURANG BAYAR</SortableHeader>
              <SortableHeader sortKey="keterangan" sortConfig={sortConfig} onSort={handleSort}>KETERANGAN</SortableHeader>
              <TableHead>AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={16} className="text-center">Memuat data...</TableCell></TableRow>
            ) : !hasFetchedData ? (
                <TableRow><TableCell colSpan={16} className="text-center">Klik "Tampilkan Data" untuk melihat catatan.</TableCell></TableRow>
            ) : paginatedData.map((item, index) => (
              <TableRow 
                key={item.id}
                className={cn(item.keterangan === 'BELUM LUNAS' && 'bg-red-100 text-red-900 hover:bg-red-200')}
              >
                 <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(item.id)}
                    onCheckedChange={() => handleSelectRow(item.id)}
                  />
                </TableCell>
                <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell>{item.noDo}</TableCell>
                <TableCell>{item.nomorPenyaluran}</TableCell>
                <TableCell>{formatDate(item.tanggal)}</TableCell>
                <TableCell>{item.kabupaten}</TableCell>
                <TableCell>{item.namaProduk}</TableCell>
                <TableCell>{item.namaKios}</TableCell>
                <TableCell>{item.namaSopir}</TableCell>
                <TableCell>{item.qty}</TableCell>
                <TableCell>{formatCurrency(item.total)}</TableCell>
                <TableCell>{formatCurrency(item.diBayar)}</TableCell>
                <TableCell>{formatCurrency(item.totalPembayaranTempo)}</TableCell>
                <TableCell>{formatCurrency(item.kurangBayar)}</TableCell>
                <TableCell>{item.keterangan}</TableCell>
                 <TableCell className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" 
                        onClick={() => handlePrintClick(item)} 
                        title="Cetak Tanda Terima">
                        <Printer className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
       {hasFetchedData && totalPages > 0 && (
        <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
                Baris per halaman
                <Select value={`${itemsPerPage}`} onValueChange={value => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-20">
                        <SelectValue placeholder={`${itemsPerPage}`} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="-1">Semua</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {itemsPerPage > 0 && (
                <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                />
            )}
        </div>
      )}
      <SpjDialog 
        item={itemToPrint}
        onCancel={() => setItemToPrint(null)}
        onPrint={(spj) => handlePrintSragenReceipt(itemToPrint, spj)}
      />
    </main>
  );
}

    