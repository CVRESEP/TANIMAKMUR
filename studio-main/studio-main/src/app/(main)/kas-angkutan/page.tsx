
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
import { FileUp, PlusCircle, Search, Trash2, Pencil, ChevronDown, ArrowDownCircle, ArrowUpCircle, Wallet, Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate, toInputDate, parseCurrency, toTitleCase, cn } from "@/lib/utils";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getKasAngkutan, addKasAngkutan, updateKasAngkutan, deleteKasAngkutan } from "@/services/kasAngkutanService";
import { getPenyaluranKios } from "@/services/penyaluranKiosService";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Combobox } from "@/components/ui/combobox";
import { DateFilter } from "@/components/ui/date-filter";
import { Pagination } from "@/components/ui/pagination";


const FormComponent = ({ item, onSave, onCancel, penyaluranData }: { item?: any, onSave: (item: any) => void, onCancel: () => void, penyaluranData: any[] }) => {
    const [formData, setFormData] = React.useState({
        kabupaten: "",
        tanggal: new Date().toISOString().split('T')[0],
        tipePengeluaran: "PENGELUARAN",
        noDo: "",
        nomorPenyaluran: "",
        namaKios: "",
        uraian: "",
        nominal: 0,
        namaSopir: "",
        admin: 0,
        uangMakan: 0,
        palang: 0,
        solar: 0,
        upahSopir: 0,
        lembur: 0,
        helper: 0,
        lainLain: 0,
        ...item,
    });
    
    const [penyaluranOptions, setPenyaluranOptions] = React.useState<{value: string, label: string}[]>([]);
    const isNoDoSelected = formData.noDo && formData.noDo !== "NONE";

    React.useEffect(() => {
        if (item) {
            setFormData(prev => ({ ...prev, ...item, tanggal: toInputDate(item.tanggal) || new Date().toISOString().split('T')[0] }));
            if (item.noDo && item.noDo !== "NONE") {
                 const relatedPenyaluran = penyaluranData.filter(p => p.noDo === item.noDo && p.nomorPenyaluran);
                 setPenyaluranOptions(relatedPenyaluran.map(p => ({ value: p.nomorPenyaluran, label: p.nomorPenyaluran })));
            }
        }
    }, [item, penyaluranData]);

    React.useEffect(() => {
        const { admin, uangMakan, palang, solar, upahSopir, lembur, helper, lainLain } = formData;
        let newNominal;

        if (isNoDoSelected) {
            newNominal = admin + uangMakan + palang + solar + upahSopir + lembur + helper + lainLain;
        } else {
            newNominal = formData.nominal;
        }

        setFormData(prev => ({ ...prev, nominal: newNominal }));
    }, [formData.admin, formData.uangMakan, formData.palang, formData.solar, formData.upahSopir, formData.lembur, formData.helper, formData.lainLain, isNoDoSelected, formData.nominal]);
    
    const handleNoDoChange = (noDo: string) => {
        if (noDo === "NONE" || !noDo) {
             setFormData(prev => ({
                ...prev, noDo, nomorPenyaluran: "", namaKios: "", uraian: "", namaSopir: "", admin: 0, uangMakan: 0,
                palang: 0, solar: 0, upahSopir: 0, lembur: 0, helper: 0, lainLain: 0, nominal: 0
            }));
            setPenyaluranOptions([]);
            return;
        }

        const relatedPenyaluran = penyaluranData.filter(p => p.noDo === noDo && p.nomorPenyaluran);
        const options = relatedPenyaluran.map(p => ({ value: p.nomorPenyaluran, label: p.nomorPenyaluran }));
        setPenyaluranOptions(options);

        // Reset fields first
        setFormData(prev => ({
            ...prev,
            noDo,
            nomorPenyaluran: "",
            namaKios: "",
            lainLain: 0,
            nominal: 0, 
        }));
        
        if (options.length === 1) {
            handlePenyaluranChange(options[0].value);
        }
    };

    const handlePenyaluranChange = (nomorPenyaluran: string) => {
        const selectedPenyaluran = penyaluranData.find(p => p.nomorPenyaluran === nomorPenyaluran);
        
        if (selectedPenyaluran) {
            const { namaProduk, qty, namaSopir, namaKios, kabupaten } = selectedPenyaluran;
            const uraian = `BIAYA ANGKUTAN - ${nomorPenyaluran} - ${namaProduk} - ${namaKios} - ${qty}`;
            
            let admin = 0, solar = 0;

            if (kabupaten === 'MAGETAN') {
                solar = qty * (100000 / 24);
                admin = qty * 2000;
            } else { // Logic for SRAGEN and others
                admin = qty * 3125;
                solar = qty * 12500;
            }
            
            const upahSopir = qty * 3500; // Standard calculation for all districts

            setFormData(prev => ({
                ...prev,
                nomorPenyaluran,
                namaKios,
                uraian,
                namaSopir,
                admin,
                solar,
                upahSopir,
            }));
        } else {
             setFormData(prev => ({ ...prev, nomorPenyaluran }));
        }
    }


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isCurrencyOrNumeric = ['nominal', 'helper', 'uangMakan', 'palang', 'lembur', 'lainLain', 'upahSopir', 'admin', 'solar'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isCurrencyOrNumeric ? parseCurrency(value) : value.toUpperCase() }));
    };
    
    const handleSelectChange = (name: string, value: string) => {
        if (name === 'kabupaten') {
            setFormData(prev => ({ ...prev, kabupaten: value, noDo: "", namaKios: "", nomorPenyaluran: "" })); // Reset NO DO & Kios
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const noDoOptions = React.useMemo(() => {
        const filteredPenyaluran = formData.kabupaten
            ? penyaluranData.filter(p => p.kabupaten === formData.kabupaten)
            : [];
        const options = ["NONE", ...new Set(filteredPenyaluran.map(p => p.noDo))];
        return options.map(op => ({ value: op, label: op }));
    }, [penyaluranData, formData.kabupaten]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
                 <div>
                    <Label htmlFor="kabupaten">KABUPATEN</Label>
                    <Select onValueChange={(value) => handleSelectChange('kabupaten', value)} value={formData.kabupaten}>
                        <SelectTrigger><SelectValue placeholder="PILIH KABUPATEN" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MAGETAN">MAGETAN</SelectItem>
                            <SelectItem value="SRAGEN">SRAGEN</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="noDo">NO DO</Label>
                    <Combobox
                        options={noDoOptions}
                        value={formData.noDo}
                        onChange={(value) => handleNoDoChange(value)}
                        placeholder="PILIH KABUPATEN DULU"
                        searchPlaceholder="CARI NO DO..."
                        emptyPlaceholder="NO DO TIDAK DITEMUKAN"
                        disabled={!formData.kabupaten}
                    />
                </div>
                <div>
                    <Label htmlFor="nomorPenyaluran">NO PENYALURAN</Label>
                    <Combobox
                        options={penyaluranOptions}
                        value={formData.nomorPenyaluran}
                        onChange={(value) => handlePenyaluranChange(value)}
                        placeholder="PILIH NO PENYALURAN"
                        searchPlaceholder="CARI NO PENYALURAN..."
                        emptyPlaceholder="NO PENYALURAN TIDAK DITEMUKAN"
                        disabled={!isNoDoSelected}
                    />
                </div>
                <div><Label htmlFor="tanggal">TANGGAL</Label><Input id="tanggal" name="tanggal" type="date" value={toInputDate(formData.tanggal)} onChange={handleChange} required /></div>
                <div>
                    <Label htmlFor="tipePengeluaran">TIPE PENGELUARAN</Label>
                    <Select onValueChange={(value) => handleSelectChange('tipePengeluaran', value)} value={formData.tipePengeluaran}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PEMASUKAN">PEMASUKAN</SelectItem>
                            <SelectItem value="PENGELUARAN">PENGELUARAN</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="namaKios">NAMA KIOS</Label>
                    <Input id="namaKios" name="namaKios" value={formData.namaKios} readOnly />
                </div>
                <div><Label htmlFor="namaSopir">NAMA SOPIR</Label><Input id="namaSopir" name="namaSopir" value={formData.namaSopir} onChange={handleChange} readOnly={isNoDoSelected} /></div>
                <div className="col-span-2"><Label htmlFor="uraian">URAIAN</Label><Input id="uraian" name="uraian" value={formData.uraian} onChange={handleChange} readOnly={isNoDoSelected && formData.noDo !== 'NONE'} /></div>
                <div><Label htmlFor="nominal">NOMINAL</Label><Input id="nominal" name="nominal" value={formatCurrency(formData.nominal)} onChange={handleChange} readOnly={isNoDoSelected} /></div>
                <div/>
                <div><Label htmlFor="admin">ADMIN</Label><Input id="admin" name="admin" value={formatCurrency(formData.admin)} onChange={handleChange} readOnly={isNoDoSelected} /></div>
                <div>
                    <Label htmlFor="uangMakan">UANG MAKAN</Label>
                    <Input id="uangMakan" name="uangMakan" value={formatCurrency(formData.uangMakan)} onChange={handleChange} readOnly={!isNoDoSelected} />
                </div>
                <div>
                    <Label htmlFor="palang">PALANG</Label>
                    <Input id="palang" name="palang" value={formatCurrency(formData.palang)} onChange={handleChange} readOnly={!isNoDoSelected} />
                </div>
                <div><Label htmlFor="solar">SOLAR</Label><Input id="solar" name="solar" value={formatCurrency(formData.solar)} onChange={handleChange} readOnly={isNoDoSelected} /></div>
                <div>
                    <Label htmlFor="upahSopir">UPAH SOPIR</Label>
                    <Input id="upahSopir" name="upahSopir" value={formatCurrency(formData.upahSopir)} onChange={handleChange} readOnly={isNoDoSelected} />
                </div>
                 <div>
                    <Label htmlFor="lembur">LEMBUR</Label>
                    <Input id="lembur" name="lembur" value={formatCurrency(formData.lembur)} onChange={handleChange} readOnly={!isNoDoSelected} />
                </div>
                <div>
                    <Label htmlFor="helper">HELPER</Label>
                    <Input id="helper" name="helper" value={formatCurrency(formData.helper)} onChange={handleChange} readOnly={!isNoDoSelected} />
                </div>
                <div>
                    <Label htmlFor="lainLain">LAIN-LAIN</Label>
                    <Input id="lainLain" name="lainLain" value={formatCurrency(formData.lainLain)} onChange={handleChange} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={onCancel}>BATAL</Button>
                <Button type="submit">SIMPAN</Button>
            </DialogFooter>
        </form>
    );
};


export default function KasAngkutanPage() {
  const { toast } = useToast();
  const [data, setData] = React.useState<any[]>([]);
  const [allPenyaluranData, setAllPenyaluranData] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedKabupaten, setSelectedKabupaten] = React.useState("SEMUA");
  const [dateFilteredData, setDateFilteredData] = React.useState<any[]>([]);
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasFetchedData, setHasFetchedData] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(25);
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [kas, penyaluran] = await Promise.all([getKasAngkutan(), getPenyaluranKios()]);
      setData(kas);
      setAllPenyaluranData(penyaluran);
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
    
    // Optimistic UI update
    setData(prev => prev.filter(item => !selectedRows.includes(item.id)));
    setSelectedRows([]);

    try {
        await deleteKasAngkutan(selectedRows);
        toast({ title: "Sukses", description: `${itemsToDelete.length} data berhasil dihapus.` });
    } catch (error) {
        // Revert UI on error
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

    // Optimistic UI update
    if (isEditing) {
      setData(prev => prev.map(d => d.id === item.id ? item : d));
    } else {
      const tempId = `temp-${Date.now()}`;
      const newItem = { ...item, id: tempId };
      setData(prev => [newItem, ...prev]);
    }

    try {
      if (isEditing) {
        await updateKasAngkutan(item.id, item);
        toast({ title: "Sukses", description: "Data berhasil diperbarui." });
      } else {
        const newId = await addKasAngkutan(item);
        setData(prev => prev.map(d => d.id.startsWith('temp-') ? { ...item, id: newId } : d));
        toast({ title: "Sukses", description: "Data berhasil ditambahkan." });
      }
    } catch (error) {
      setData(originalData);
      console.error("Failed to save data:", error);
      toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data." });
    }
  };

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


  const totalPemasukan = filteredData.reduce((sum, item) => item.tipePengeluaran === 'PEMASUKAN' ? sum + item.nominal : sum, 0);
  const totalPengeluaran = filteredData.reduce((sum, item) => item.tipePengeluaran === 'PENGELUARAN' ? sum + item.nominal : sum, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const handleExportXlsx = () => {
    const dataToExport = filteredData.map(item => ({
        'KABUPATEN': item.kabupaten,
        'TANGGAL': formatDate(item.tanggal),
        'TIPE': item.tipePengeluaran,
        'NO PENYALURAN': item.nomorPenyaluran,
        'NAMA KIOS': item.namaKios,
        'URAIAN': item.uraian,
        'NOMINAL': item.nominal,
        'NAMA SOPIR': item.namaSopir,
        'ADMIN': item.admin,
        'UANG MAKAN': item.uangMakan,
        'PALANG': item.palang,
        'SOLAR': item.solar,
        'UPAH SOPIR': item.upahSopir,
        'LEMBUR': item.lembur,
        'HELPER': item.helper,
        'LAIN-LAIN': item.lainLain,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kas Angkutan");
    XLSX.writeFile(workbook, `Laporan_Kas_Angkutan_${selectedKabupaten.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    let startY = 8;

    const generateReportForKabupaten = (kabupaten: string) => {
        const dataForKabupaten = filteredData.filter(item => item.kabupaten === kabupaten);
        if (dataForKabupaten.length === 0) return;

        if (startY > 8) {
            doc.addPage();
            startY = 8;
        }

        const totalPemasukanKab = dataForKabupaten.reduce((sum, item) => item.tipePengeluaran === 'PEMASUKAN' ? sum + item.nominal : sum, 0);
        const totalPengeluaranKab = dataForKabupaten.reduce((sum, item) => item.tipePengeluaran === 'PENGELUARAN' ? sum + item.nominal : sum, 0);
        const saldoKab = totalPemasukanKab - totalPengeluaranKab;

        // Draw cards
        doc.setFontSize(10);
        doc.text('TOTAL PEMASUKAN', 53, startY + 5, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(totalPemasukanKab), 53, startY + 12, { align: 'center' });
        doc.rect(8, startY, 90, 15, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('TOTAL PENGELUARAN', 148, startY + 5, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(totalPengeluaranKab), 148, startY + 12, { align: 'center' });
        doc.rect(103, startY, 90, 15, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('SALDO', 243, startY + 5, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(saldoKab), 243, startY + 12, { align: 'center' });
        doc.rect(198, startY, 90, 15, 'S');
        
        startY += 25;

        // Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`LAPORAN KAS ANGKUTAN - ${kabupaten}`, 14, startY);
        startY += 7;

        (doc as any).autoTable({
            head: [['KABUPATEN', 'TANGGAL', 'TIPE', 'NO PENYALURAN', 'NAMA KIOS', 'URAIAN', 'NOMINAL', 'NAMA SOPIR', 'ADMIN', 'UANG MAKAN', 'PALANG', 'SOLAR', 'UPAH SOPIR', 'LEMBUR', 'HELPER', 'LAIN-LAIN']],
            body: dataForKabupaten.map(item => [
                item.kabupaten,
                formatDate(item.tanggal),
                item.tipePengeluaran,
                item.nomorPenyaluran,
                item.namaKios,
                item.uraian,
                formatCurrency(item.nominal),
                item.namaSopir,
                formatCurrency(item.admin),
                formatCurrency(item.uangMakan),
                formatCurrency(item.palang),
                formatCurrency(item.solar),
                formatCurrency(item.upahSopir),
                formatCurrency(item.lembur),
                formatCurrency(item.helper),
                formatCurrency(item.lainLain),
            ]),
            startY,
            margin: { top: 8, right: 8, bottom: 8, left: 8 },
            styles: { fontSize: 6 },
            headStyles: { fontStyle: 'bold' },
        });
        startY = (doc as any).autoTable.previous.finalY + 10;
    };

    if (selectedKabupaten === 'SEMUA') {
        const kabupatensToPrint = kabupatenOptions.filter(k => k !== 'SEMUA');
        kabupatensToPrint.forEach(kab => generateReportForKabupaten(kab));
    } else {
        generateReportForKabupaten(selectedKabupaten);
    }
    
    doc.save(`laporan_kas_angkutan_${selectedKabupaten.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
    const handlePrint = (item: any) => {
        const doc = new jsPDF({
            orientation: 'l', // landscape
            unit: 'mm',
            format: 'a6' // A6 paper size
        });

        doc.setFontSize(10);
        
        doc.text("TANDA TERIMA", 15, 20);
        doc.text(`Tanggal: ${formatDate(item.tanggal)}`, 15, 30);
        doc.text(`Uraian: ${item.uraian}`, 15, 40);
        doc.text(`Sopir: ${item.namaSopir}`, 15, 50);
        doc.text(`Nominal: ${formatCurrency(item.nominal)}`, 15, 60);

        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    };

  React.useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedKabupaten, dateFilteredData, itemsPerPage, sortConfig]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL PEMASUKAN</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPemasukan)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL PENGELUARAN</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalPengeluaran)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SALDO</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(saldo)}</div>
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
            <DateFilter data={data} onFilterChange={setDateFilteredData} />
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
            <Button variant="outline" disabled>
                <FileUp className="mr-2 h-4 w-4" />
                IMPORT
            </Button>
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
                    <DialogTitle>{editingItem ? 'EDIT' : 'TAMBAH'} DATA KAS ANGKUTAN</DialogTitle>
                    </DialogHeader>
                    <FormComponent
                        item={editingItem}
                        onSave={handleSave}
                        onCancel={() => { setIsAddDialogOpen(false); setEditingItem(null); }}
                        penyaluranData={allPenyaluranData}
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
              <SortableHeader sortKey="kabupaten" sortConfig={sortConfig} onSort={handleSort}>KABUPATEN</SortableHeader>
              <SortableHeader sortKey="tanggal" sortConfig={sortConfig} onSort={handleSort}>TANGGAL</SortableHeader>
              <SortableHeader sortKey="tipePengeluaran" sortConfig={sortConfig} onSort={handleSort}>TIPE PENGELUARAN</SortableHeader>
              <SortableHeader sortKey="noDo" sortConfig={sortConfig} onSort={handleSort}>NO DO</SortableHeader>
              <SortableHeader sortKey="nomorPenyaluran" sortConfig={sortConfig} onSort={handleSort}>NO PENYALURAN</SortableHeader>
              <SortableHeader sortKey="namaKios" sortConfig={sortConfig} onSort={handleSort} className="w-[150px]">NAMA KIOS</SortableHeader>
              <SortableHeader sortKey="uraian" sortConfig={sortConfig} onSort={handleSort}>URAIAN</SortableHeader>
              <SortableHeader sortKey="nominal" sortConfig={sortConfig} onSort={handleSort}>NOMINAL</SortableHeader>
              <SortableHeader sortKey="namaSopir" sortConfig={sortConfig} onSort={handleSort}>NAMA SOPIR</SortableHeader>
              <SortableHeader sortKey="admin" sortConfig={sortConfig} onSort={handleSort}>ADMIN</SortableHeader>
              <SortableHeader sortKey="uangMakan" sortConfig={sortConfig} onSort={handleSort}>UANG MAKAN</SortableHeader>
              <SortableHeader sortKey="palang" sortConfig={sortConfig} onSort={handleSort}>PALANG</SortableHeader>
              <SortableHeader sortKey="solar" sortConfig={sortConfig} onSort={handleSort}>SOLAR</SortableHeader>
              <SortableHeader sortKey="upahSopir" sortConfig={sortConfig} onSort={handleSort}>UPAH SOPIR</SortableHeader>
              <SortableHeader sortKey="lembur" sortConfig={sortConfig} onSort={handleSort}>LEMBUR</SortableHeader>
              <SortableHeader sortKey="helper" sortConfig={sortConfig} onSort={handleSort}>HELPER</SortableHeader>
              <SortableHeader sortKey="lainLain" sortConfig={sortConfig} onSort={handleSort}>LAIN-LAIN</SortableHeader>
              <TableHead>AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
                <TableRow><TableCell colSpan={20} className="text-center">Memuat data...</TableCell></TableRow>
            ) : !hasFetchedData ? (
                <TableRow><TableCell colSpan={20} className="text-center">Klik "Tampilkan Data" untuk melihat catatan.</TableCell></TableRow>
            ) : paginatedData.map((item, index) => (
              <TableRow 
                key={item.id}
                className={cn(
                    item.tipePengeluaran === 'PEMASUKAN' && 'bg-green-100 text-green-900 hover:bg-green-200',
                    item.tipePengeluaran === 'PENGELUARAN' && 'bg-red-100 text-red-900 hover:bg-red-200'
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(item.id)}
                    onCheckedChange={() => handleSelectRow(item.id)}
                  />
                </TableCell>
                <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell>{item.kabupaten}</TableCell>
                <TableCell>{formatDate(item.tanggal)}</TableCell>
                <TableCell>{item.tipePengeluaran}</TableCell>
                <TableCell>{item.noDo}</TableCell>
                <TableCell>{item.nomorPenyaluran}</TableCell>
                <TableCell>{item.namaKios}</TableCell>
                <TableCell>{item.uraian}</TableCell>
                <TableCell>{formatCurrency(item.nominal)}</TableCell>
                <TableCell>{item.namaSopir}</TableCell>
                <TableCell>{formatCurrency(item.admin)}</TableCell>
                <TableCell>{formatCurrency(item.uangMakan)}</TableCell>
                <TableCell>{formatCurrency(item.palang)}</TableCell>
                <TableCell>{formatCurrency(item.solar)}</TableCell>
                <TableCell>{formatCurrency(item.upahSopir)}</TableCell>
                <TableCell>{formatCurrency(item.lembur)}</TableCell>
                <TableCell>{formatCurrency(item.helper)}</TableCell>
                <TableCell>{formatCurrency(item.lainLain)}</TableCell>
                 <TableCell className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => handlePrint(item)} title="Cetak Tanda Terima">
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
    </main>
  );
}

    