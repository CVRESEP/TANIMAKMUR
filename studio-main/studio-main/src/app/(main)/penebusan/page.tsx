
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
import { FileUp, PlusCircle, Search, Trash2, Pencil, ChevronDown, Repeat, Truck, DollarSign } from "lucide-react";
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
import { getPenebusan, addPenebusan, updatePenebusan, deletePenebusan, addPenebusanBatch } from "@/services/penebusanService";
import { getProducts } from "@/services/productService";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DateFilter } from "@/components/ui/date-filter";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const FormComponent = ({ item, onSave, onCancel, productsData, existingData }: { item?: any, onSave: (item: any) => void, onCancel: () => void, productsData: any[], existingData: any[] }) => {
    const { toast } = useToast();
    const [formData, setFormData] = React.useState({
        noDo: "",
        tanggal: new Date().toISOString().split('T')[0],
        kabupaten: "",
        supplier: "",
        namaProduk: "",
        qty: 0,
        totalPenebusan: 0,
        ...item,
    });
    
    React.useEffect(() => {
        if (item) {
            setFormData(prev => ({ ...prev, ...item, tanggal: toInputDate(item.tanggal) || new Date().toISOString().split('T')[0] }));
        }
    }, [item]);

    React.useEffect(() => {
      const { qty, namaProduk } = formData;
      if (namaProduk && qty > 0) {
        const product = productsData.find(p => p.productName === namaProduk);
        if (product) {
          setFormData(prev => ({
            ...prev,
            totalPenebusan: qty * product.hargaBeli
          }));
        }
      } else {
        setFormData(prev => ({ ...prev, totalPenebusan: 0 }));
      }
    }, [formData.qty, formData.namaProduk, productsData]);
    
    const handleProductNameChange = (productName: string) => {
      const product = productsData.find(p => p.productName === productName);
      if (product) {
        setFormData(prev => ({
          ...prev,
          namaProduk: productName,
          supplier: product.supplier,
        }));
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['qty'].includes(name);
        setFormData(prev => ({ 
            ...prev, 
            [name]: isNumeric ? Number(value) : value.toUpperCase() 
        }));
    };
    
    const handleSelectChange = (name: string, value: string) => {
        if (name === 'kabupaten') {
            setFormData(prev => ({ ...prev, kabupaten: value, namaProduk: '', supplier: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // --- VALIDATION START ---
        if (!formData.noDo || !formData.tanggal || !formData.kabupaten || !formData.namaProduk || !formData.supplier || formData.qty <= 0) {
            toast({
                variant: "destructive",
                title: "VALIDASI GAGAL",
                description: "SEMUA KOLOM WAJIB DIISI DAN QTY HARUS LEBIH DARI 0. DATA TIDAK DISIMPAN.",
            });
            return;
        }
        // --- VALIDATION END ---
        
        if (!item?.id && existingData.some(d => d.noDo.toUpperCase() === formData.noDo.toUpperCase())) {
          toast({
            variant: "destructive",
            title: "VALIDASI GAGAL",
            description: `NO DO "${formData.noDo}" SUDAH ADA. DATA TIDAK DISIMPAN.`,
          });
          return;
        }
        onSave(formData);
    };
    
    const filteredProducts = React.useMemo(() => {
        if (!formData.kabupaten) return [];
        return productsData.filter(p => p.kabupaten === formData.kabupaten);
    }, [formData.kabupaten, productsData]);


    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
                <div><Label htmlFor="noDo">NO DO</Label><Input id="noDo" name="noDo" value={formData.noDo} onChange={handleChange} required disabled={!!item?.id} /></div>
                <div><Label htmlFor="tanggal">TANGGAL</Label><Input id="tanggal" name="tanggal" type="date" value={toInputDate(formData.tanggal)} onChange={handleChange} required /></div>
                <div>
                    <Label htmlFor="kabupaten">KABUPATEN</Label>
                    <Select onValueChange={(value) => handleSelectChange('kabupaten', value)} value={formData.kabupaten} required>
                        <SelectTrigger><SelectValue placeholder="PILIH KABUPATEN" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MAGETAN">MAGETAN</SelectItem>
                            <SelectItem value="SRAGEN">SRAGEN</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="namaProduk">NAMA PRODUK</Label>
                    <Select onValueChange={handleProductNameChange} value={formData.namaProduk} disabled={!formData.kabupaten} required>
                        <SelectTrigger><SelectValue placeholder="PILIH PRODUK" /></SelectTrigger>
                        <SelectContent>
                            {filteredProducts.map(p => <SelectItem key={p.id} value={p.productName}>{p.productName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div><Label htmlFor="supplier">SUPPLIER</Label><Input id="supplier" name="supplier" value={formData.supplier} readOnly required /></div>
                <div><Label htmlFor="qty">QTY (TON)</Label><Input id="qty" name="qty" type="number" value={formData.qty} onChange={handleChange} required /></div>
                <div className="col-span-2"><Label htmlFor="totalPenebusan">TOTAL PENEBUSAN</Label><Input id="totalPenebusan" name="totalPenebusan" value={formatCurrency(formData.totalPenebusan)} readOnly required /></div>
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
                <DialogTitle>IMPORT DATA PENEBUSAN</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="file">PILIH FILE EXCEL (.XLSX)</Label>
                <Input id="file" type="file" accept=".xlsx" onChange={handleFileChange} />
                <p className="text-sm text-muted-foreground mt-2">
                    Pastikan urutan kolom: `NO DO`, `TANGGAL`, `KABUPATEN`, `SUPPLIER`, `NAMA PRODUK`, `QTY (TON)`, `TOTAL PENEBUSAN`. Header akan diabaikan.
                </p>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={onCancel}>BATAL</Button>
                <Button onClick={handleImportClick} disabled={!file}>IMPORT</Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function PenebusanPage() {
    const { toast } = useToast();
    const [data, setData] = React.useState<any[]>([]);
    const [productsData, setProductsData] = React.useState<any[]>([]);
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
            const [penebusan, products] = await Promise.all([getPenebusan(), getProducts()]);
            setData(penebusan);
            setProductsData(products);
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
        
        setData(prev => prev.filter(item => !selectedRows.includes(item.id)));
        setSelectedRows([]);

        try {
            await deletePenebusan(selectedRows);
            toast({ title: "Sukses", description: `${itemsToDelete.length} data berhasil dihapus.` });
        } catch (error) {
            setData(originalData);
            console.error("Failed to delete penebusan:", error);
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
            const newItem = { ...item, id: item.noDo }; // Use noDo as temporary ID
            setData(prev => [newItem, ...prev]);
        }
        
        try {
            if (isEditing) {
                await updatePenebusan(item.id, item);
                toast({ title: "Sukses", description: "Data berhasil diperbarui." });
            } else {
                await addPenebusan(item);
                toast({ title: "Sukses", description: "Data berhasil ditambahkan." });
            }
        } catch (error: any) {
            setData(originalData);
            console.error("Failed to save penebusan:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Gagal menyimpan data." });
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

                const newPenebusan = dataRows.map(row => {
                    let tanggal = "";
                    if (row[1] instanceof Date) {
                        tanggal = row[1].toISOString().split('T')[0];
                    } else if (typeof row[1] === 'string') {
                        tanggal = toInputDate(row[1]); // Convert DD/MM/YYYY to YYYY-MM-DD
                    }

                    return {
                        noDo: String(row[0] || '').toUpperCase(),
                        tanggal,
                        kabupaten: String(row[2] || '').toUpperCase(),
                        supplier: String(row[3] || '').toUpperCase(),
                        namaProduk: String(row[4] || '').toUpperCase(),
                        qty: Number(row[5] || 0),
                        totalPenebusan: Number(row[6] || 0),
                    }
                }).filter(p => p.noDo && p.tanggal);
                
                if (newPenebusan.length > 0) {
                    await addPenebusanBatch(newPenebusan);
                    toast({ title: "Sukses", description: `${newPenebusan.length} data penebusan berhasil diimpor.` });
                    fetchData();
                } else {
                     toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data valid untuk diimpor. Periksa kembali file Anda." });
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

    const totalTransaksi = filteredData.length;
    const totalQtyPenebusan = filteredData.reduce((sum, item) => sum + item.qty, 0);
    const totalNilaiPenebusan = filteredData.reduce((sum, item) => sum + item.totalPenebusan, 0);

    const handleExportXlsx = () => {
        const dataToExport = filteredData.map(item => ({
            'NO DO': item.noDo,
            'TANGGAL': formatDate(item.tanggal),
            'KABUPATEN': item.kabupaten,
            'SUPPLIER': item.supplier,
            'NAMA PRODUK': item.namaProduk,
            'QTY (TON)': item.qty,
            'TOTAL PENEBUSAN': item.totalPenebusan,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Penebusan");
        XLSX.writeFile(workbook, "Laporan_Penebusan.xlsx");
    };

    const handleExportPdf = () => {
        const doc = new jsPDF();
        doc.text("Laporan Penebusan", 14, 16);
        (doc as any).autoTable({
            head: [['NO DO', 'TANGGAL', 'KABUPATEN', 'SUPPLIER', 'NAMA PRODUK', 'QTY (TON)', 'TOTAL PENEBUSAN']],
            body: filteredData.map(item => [
                item.noDo,
                formatDate(item.tanggal),
                item.kabupaten,
                item.supplier,
                item.namaProduk,
                item.qty,
                formatCurrency(item.totalPenebusan)
            ]),
            startY: 20,
        });
        doc.save('laporan_penebusan.pdf');
    };

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedKabupaten, dateFilteredData, itemsPerPage, sortConfig]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">TOTAL QTY PENEBUSAN</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQtyPenebusan.toFixed(2)} Ton</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL NILAI PENEBUSAN</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalNilaiPenebusan)}</div>
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
                    <DialogTitle>{editingItem ? 'EDIT' : 'TAMBAH'} DATA PENEBUSAN</DialogTitle>
                    </DialogHeader>
                    <FormComponent 
                        item={editingItem} 
                        onSave={handleSave} 
                        onCancel={() => { setIsAddDialogOpen(false); setEditingItem(null); }}
                        productsData={productsData}
                        existingData={data}
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
              <SortableHeader sortKey="supplier" sortConfig={sortConfig} onSort={handleSort}>SUPPLIER</SortableHeader>
              <SortableHeader sortKey="namaProduk" sortConfig={sortConfig} onSort={handleSort}>NAMA PRODUK</SortableHeader>
              <SortableHeader sortKey="qty" sortConfig={sortConfig} onSort={handleSort}>QTY (TON)</SortableHeader>
              <SortableHeader sortKey="totalPenebusan" sortConfig={sortConfig} onSort={handleSort}>TOTAL PENEBUSAN</SortableHeader>
              <TableHead>AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center">Memuat data...</TableCell></TableRow>
            ) : !hasFetchedData ? (
                <TableRow><TableCell colSpan={10} className="text-center">Klik "Tampilkan Data" untuk melihat catatan.</TableCell></TableRow>
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
                <TableCell>{item.supplier}</TableCell>
                <TableCell>{item.namaProduk}</TableCell>
                <TableCell>{item.qty}</TableCell>
                <TableCell>{formatCurrency(item.totalPenebusan)}</TableCell>
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

    