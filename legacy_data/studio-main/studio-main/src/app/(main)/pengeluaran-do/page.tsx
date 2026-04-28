
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
import { FileUp, PlusCircle, Search, Trash2, Pencil, ChevronDown, PackageCheck, PackageX, Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, toTitleCase, toInputDate, formatCurrency } from "@/lib/utils";
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
import { getPenebusan } from "@/services/penebusanService";
import { getProcessedPengeluaranDo, addPengeluaranDo, updatePengeluaranDo, deletePengeluaranDo, addPengeluaranDoBatch, getPengeluaranDo as getSourcePengeluaranDo } from "@/services/pengeluaranDoService";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Combobox } from "@/components/ui/combobox";
import { DateFilter } from "@/components/ui/date-filter";
import { Pagination } from "@/components/ui/pagination";
import { getPenyaluranKios } from "@/services/penyaluranKiosService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const FormComponent = ({ item, onSave, onCancel, allData }: { item?: any, onSave: (item: any) => void, onCancel: () => void, allData: any }) => {
    const { penebusanOptions, penyaluranKiosData, pengeluaranDoSourceData } = allData;

    const [formData, setFormData] = React.useState({
        id: "", // noDo
        qty: 0,
        tanggal: new Date().toISOString().split('T')[0],
        ...item,
    });
    
    const [relatedData, setRelatedData] = React.useState({
        kabupaten: "",
        namaProduk: "",
        supplier: "",
        totalTebus: 0,
        sisaTebus: 0,
        sisaDo: 0,
    });

    const updateRelatedData = (noDo: string, qtyPengeluaran: number) => {
        const selectedPenebusan = penebusanOptions.find((p:any) => p.noDo === noDo);
        if (selectedPenebusan) {
            const totalPenyaluran = (penyaluranKiosData || [])
                .filter((p: any) => p.noDo === noDo)
                .reduce((sum: number, p: any) => sum + p.qty, 0);

            const sisaTebus = selectedPenebusan.qty - qtyPengeluaran;
            const sisaDo = qtyPengeluaran - totalPenyaluran;

            setRelatedData({
                kabupaten: selectedPenebusan.kabupaten,
                namaProduk: selectedPenebusan.namaProduk,
                supplier: selectedPenebusan.supplier,
                totalTebus: selectedPenebusan.qty,
                sisaTebus,
                sisaDo,
            });
        }
    };

    React.useEffect(() => {
        if (item) {
             const qtyPengeluaran = pengeluaranDoSourceData.find((p: any) => p.id === item.noDo)?.qty || 0;
             setFormData({
                id: item.noDo,
                qty: qtyPengeluaran,
                tanggal: toInputDate(item.tanggal)
            });
            updateRelatedData(item.noDo, qtyPengeluaran);
        }
    }, [item]);
    
    const handleSelectChange = (noDo: string, currentQty?: number) => {
        const selectedPenebusan = penebusanOptions.find((p:any) => p.noDo === noDo);
        if (selectedPenebusan) {
            const qtyToEdit = pengeluaranDoSourceData.find((p: any) => p.id === noDo)?.qty || 0;
            const qtyPengeluaran = currentQty ?? qtyToEdit;
            
            setFormData(prev => ({
                ...prev,
                id: noDo,
                qty: qtyPengeluaran,
                tanggal: prev.tanggal || toInputDate(selectedPenebusan.tanggal),
            }));

            updateRelatedData(noDo, qtyPengeluaran);

        } else {
             setFormData(prev => ({ ...prev, id: noDo }));
             setRelatedData({ kabupaten: "", namaProduk: "", supplier: "", totalTebus: 0, sisaTebus: 0, sisaDo: 0 });
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newQty = name === 'qty' ? Number(value) : formData.qty;
        
        setFormData(prev => ({ ...prev, [name]: name === 'qty' ? newQty : value.toUpperCase() }));

        if (name === 'qty') {
            updateRelatedData(formData.id, newQty);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const noDoOptions = React.useMemo(() => {
        const existingPengeluaranIds = pengeluaranDoSourceData.map((p:any) => p.id);
        const options = item ? penebusanOptions : penebusanOptions.filter((p:any) => !existingPengeluaranIds.includes(p.noDo));
        return options.map((p:any) => ({ value: p.noDo, label: p.noDo }));
    }, [penebusanOptions, pengeluaranDoSourceData, item]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                    <Label htmlFor="id">NO DO</Label>
                    <Combobox
                        options={noDoOptions}
                        value={formData.id}
                        onChange={(value) => handleSelectChange(value, 0)}
                        placeholder="PILIH NO DO"
                        searchPlaceholder="CARI NO DO..."
                        emptyPlaceholder="NO DO TIDAK DITEMUKAN"
                        disabled={!!item?.id}
                    />
                </div>
                <div><Label htmlFor="tanggal">TANGGAL</Label><Input id="tanggal" name="tanggal" type="date" value={toInputDate(formData.tanggal)} onChange={handleChange} /></div>
                <div><Label htmlFor="kabupaten">KABUPATEN</Label><Input id="kabupaten" name="kabupaten" value={relatedData.kabupaten} readOnly /></div>
                <div><Label htmlFor="namaProduk">NAMA PRODUK</Label><Input id="namaProduk" name="namaProduk" value={relatedData.namaProduk} readOnly /></div>
                <div><Label htmlFor="supplier">SUPPLIER</Label><Input id="supplier" name="supplier" value={relatedData.supplier} readOnly /></div>
                <div><Label htmlFor="qty">QTY (TON)</Label><Input id="qty" name="qty" type="number" step="0.01" value={formData.qty} onChange={handleChange} required /></div>
                <div><Label htmlFor="totalTebus">TOTAL TEBUS (TON)</Label><Input id="totalTebus" value={relatedData.totalTebus.toFixed(2)} readOnly /></div>
                <div><Label htmlFor="sisaTebus">SISA TEBUS (TON)</Label><Input id="sisaTebus" value={relatedData.sisaTebus.toFixed(2)} readOnly /></div>
                <div className="col-span-2"><Label htmlFor="sisaDo">SISA DO (TON)</Label><Input id="sisaDo" value={relatedData.sisaDo.toFixed(2)} readOnly /></div>
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
                <DialogTitle>IMPORT DATA PENGELUARAN DO</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="file">PILIH FILE EXCEL (.XLSX)</Label>
                <Input id="file" type="file" accept=".xlsx" onChange={handleFileChange} />
                <p className="text-sm text-muted-foreground mt-2">
                    Pastikan urutan kolom: `NO DO`, `TANGGAL`, `KABUPATEN`, `QTY`. Header akan diabaikan.
                </p>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={onCancel}>BATAL</Button>
                <Button onClick={handleImportClick} disabled={!file}>IMPORT</Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function PengeluaranDoPage() {
    const { toast } = useToast();
    const [pengeluaranData, setPengeluaranData] = React.useState<any[]>([]);
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
    
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [processedData, penebusan, pengeluaranDo, penyaluranKios] = await Promise.all([
                getProcessedPengeluaranDo(),
                getPenebusan(),
                getSourcePengeluaranDo(),
                getPenyaluranKios()
            ]);
            setPengeluaranData(processedData);
            setAllDataForForm({
                penebusanOptions: penebusan,
                pengeluaranDoSourceData: pengeluaranDo,
                penyaluranKiosData: penyaluranKios
            });
        } catch (error) {
             console.error("Failed to fetch data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal memuat data." });
        } finally {
            setIsLoading(false);
        }
    }

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
        const originalData = [...pengeluaranData];
        const itemsToDelete = pengeluaranData.filter(item => selectedRows.includes(item.id));
        const idsToDelete = itemsToDelete.map(item => item.noDo);
        
        setPengeluaranData(prev => prev.filter(item => !selectedRows.includes(item.id)));
        setSelectedRows([]);
        
        try {
            await deletePengeluaranDo(idsToDelete);
            toast({ title: "Sukses", description: "Data berhasil dihapus." });
        } catch (error) {
            setPengeluaranData(originalData);
            console.error("Failed to delete items:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menghapus data." });
        }
    };
    
    const handleSave = async (item: any) => {
        const isEditing = !!editingItem;
        const originalData = [...pengeluaranData];
        setIsAddDialogOpen(false);
        setEditingItem(null);
        
        const itemToSave = { id: item.id, qty: item.qty, tanggal: item.tanggal };

        // Optimistic UI update requires more complex data joining, so we fetch again for simplicity
        try {
            if (isEditing) {
                await updatePengeluaranDo(itemToSave.id, { qty: itemToSave.qty, tanggal: itemToSave.tanggal });
                toast({ title: "Sukses", description: "Data berhasil diperbarui." });
            } else {
                await addPengeluaranDo(itemToSave);
                toast({ title: "Sukses", description: "Data berhasil ditambahkan." });
            }
            fetchData(); // Refetch data to ensure consistency
        } catch (error) {
            setPengeluaranData(originalData);
            console.error("Failed to save item:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data." });
        }
    };
    
    const handleImport = async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

                const dataRows = json.slice(1);

                const newPengeluaran = dataRows.map(row => ({
                    id: String(row[0] || '').toUpperCase(), // NO DO is the ID
                    qty: Number(row[3] || 0),
                    tanggal: toInputDate(row[1])
                })).filter(p => p.id && p.qty > 0 && p.tanggal);
                
                if (newPengeluaran.length > 0) {
                    await addPengeluaranDoBatch(newPengeluaran);
                    toast({ title: "Sukses", description: `${newPengeluaran.length} data berhasil diimpor.` });
                    fetchData();
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

  const totalQtyDikeluarkan = filteredData.reduce((sum, item) => sum + item.qty, 0);
  const totalSisaTebus = filteredData.reduce((sum, item) => sum + item.sisaTebus, 0);
  const totalSisaDo = filteredData.reduce((sum, item) => sum + item.sisaDo, 0);

    const handleExportXlsx = () => {
        const dataToExport = filteredData.map(item => ({
            'NO DO': item.noDo,
            'TANGGAL': formatDate(item.tanggal),
            'KABUPATEN': item.kabupaten,
            'NAMA PRODUK': item.namaProduk,
            'QTY (TON)': item.qty.toFixed(2),
            'TOTAL TEBUS (TON)': item.totalTebus.toFixed(2),
            'SISA TEBUS (TON)': item.sisaTebus.toFixed(2),
            'SISA DO (TON)': item.sisaDo.toFixed(2),
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pengeluaran DO");
        XLSX.writeFile(workbook, "Laporan_Pengeluaran_DO.xlsx");
    };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Laporan Pengeluaran DO", 14, 16);
    (doc as any).autoTable({
        head: [['NO DO', 'TANGGAL', 'KABUPATEN', 'NAMA PRODUK', 'QTY (TON)', 'TOTAL TEBUS (TON)', 'SISA TEBUS (TON)', 'SISA DO (TON)']],
        body: filteredData.map(item => [
            item.noDo,
            formatDate(item.tanggal),
            item.kabupaten,
            item.namaProduk,
            item.qty.toFixed(2),
            item.totalTebus.toFixed(2),
            item.sisaTebus.toFixed(2),
            item.sisaDo.toFixed(2)
        ]),
        startY: 20,
    });
    doc.save('laporan_pengeluaran_do.pdf');
  };

  React.useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedKabupaten, dateFilteredData, itemsPerPage, sortConfig]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
       <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL DO DIKELUARKAN</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQtyDikeluarkan.toFixed(2)} Ton</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL SISA TEBUS</CardTitle>
            <PackageX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSisaTebus.toFixed(2)} Ton</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL SISA DO</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSisaDo.toFixed(2)} Ton</div>
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
            <DateFilter data={pengeluaranData} onFilterChange={setDateFilteredData} />
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
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>{editingItem ? 'EDIT' : 'TAMBAH'} DATA PENGELUARAN DO</DialogTitle>
                    </DialogHeader>
                    <FormComponent 
                        item={editingItem ? pengeluaranData.find(p => p.id === editingItem.id) : null}
                        onSave={handleSave} 
                        onCancel={() => { setIsAddDialogOpen(false); setEditingItem(null); }}
                        allData={allDataForForm}
                    />
                </DialogContent>
            </Dialog>
        </div>
      </div>
      <div className="border shadow-sm rounded-lg">
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
              <SortableHeader sortKey="tanggal" sortConfig={sortConfig} onSort={handleSort}>TANGGAL</SortableHeader>
              <SortableHeader sortKey="kabupaten" sortConfig={sortConfig} onSort={handleSort}>KABUPATEN</SortableHeader>
              <SortableHeader sortKey="namaProduk" sortConfig={sortConfig} onSort={handleSort}>NAMA PRODUK</SortableHeader>
              <SortableHeader sortKey="qty" sortConfig={sortConfig} onSort={handleSort}>QTY (TON)</SortableHeader>
              <SortableHeader sortKey="totalTebus" sortConfig={sortConfig} onSort={handleSort}>TOTAL TEBUS (TON)</SortableHeader>
              <SortableHeader sortKey="sisaTebus" sortConfig={sortConfig} onSort={handleSort}>SISA TEBUS (TON)</SortableHeader>
              <SortableHeader sortKey="sisaDo" sortConfig={sortConfig} onSort={handleSort}>SISA DO (TON)</SortableHeader>
              <TableHead>AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center">Memuat data...</TableCell></TableRow>
            ) : !hasFetchedData ? (
                <TableRow><TableCell colSpan={11} className="text-center">Klik "Tampilkan Data" untuk melihat catatan.</TableCell></TableRow>
            ) : paginatedData.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(item.id)}
                    onCheckedChange={() => handleSelectRow(item.id)}
                  />
                </TableCell>
                <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell className="font-medium">{item.noDo}</TableCell>
                <TableCell>{formatDate(item.tanggal)}</TableCell>
                <TableCell>{item.kabupaten}</TableCell>
                <TableCell>{item.namaProduk}</TableCell>
                <TableCell>{item.qty.toFixed(2)}</TableCell>
                <TableCell>{item.totalTebus.toFixed(2)}</TableCell>
                <TableCell>{item.sisaTebus.toFixed(2)}</TableCell>
                <TableCell>{item.sisaDo.toFixed(2)}</TableCell>
                 <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                        <Pencil className="h-4 w-4" />
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

    