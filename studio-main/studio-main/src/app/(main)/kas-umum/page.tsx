
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
import { FileUp, PlusCircle, Search, Trash2, Pencil, ChevronDown, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
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
import { getKasUmum, addKasUmum, updateKasUmum, deleteKasUmum } from "@/services/kasUmumService";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DateFilter } from "@/components/ui/date-filter";
import { Pagination } from "@/components/ui/pagination";


const FormComponent = ({ item, onSave, onCancel }: { item?: any, onSave: (item: any) => void, onCancel: () => void }) => {
    const [formData, setFormData] = React.useState({
        kabupaten: "",
        tanggal: new Date().toISOString().split('T')[0],
        uraian: "",
        pemasukan: 0,
        pengeluaran: 0,
        ...item,
    });
    const [tipe, setTipe] = React.useState(item?.pemasukan > 0 ? "PEMASUKAN" : "PENGELUARAN");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isCurrency = ['pemasukan', 'pengeluaran'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isCurrency ? parseCurrency(value) : value.toUpperCase() }));
    };
    
    React.useEffect(() => {
        if (item) {
            setFormData(prev => ({ ...prev, ...item, tanggal: toInputDate(item.tanggal) || new Date().toISOString().split('T')[0] }));
             setTipe(item?.pemasukan > 0 ? "PEMASUKAN" : "PENGELUARAN");
        }
    }, [item]);

    React.useEffect(() => {
        if (tipe === "PEMASUKAN") {
            setFormData(prev => ({ ...prev, pengeluaran: 0 }));
        } else {
            setFormData(prev => ({ ...prev, pemasukan: 0 }));
        }
    }, [tipe]);

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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
                <div><Label htmlFor="tanggal">TANGGAL</Label><Input id="tanggal" name="tanggal" type="date" value={toInputDate(formData.tanggal)} onChange={handleChange} required /></div>
                <div className="col-span-2"><Label htmlFor="uraian">URAIAN</Label><Input id="uraian" name="uraian" value={formData.uraian} onChange={handleChange} required /></div>
                 <div>
                    <Label htmlFor="tipe">TIPE</Label>
                    <Select onValueChange={setTipe} value={tipe}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PEMASUKAN">PEMASUKAN</SelectItem>
                            <SelectItem value="PENGELUARAN">PENGELUARAN</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {tipe === "PEMASUKAN" && (
                    <div><Label htmlFor="pemasukan">PEMASUKAN</Label><Input id="pemasukan" name="pemasukan" value={formatCurrency(formData.pemasukan)} onChange={handleChange} /></div>
                )}
                {tipe === "PENGELUARAN" && (
                    <div><Label htmlFor="pengeluaran">PENGELUARAN</Label><Input id="pengeluaran" name="pengeluaran" value={formatCurrency(formData.pengeluaran)} onChange={handleChange} /></div>
                )}
            </div>
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={onCancel}>BATAL</Button>
                <Button type="submit">SIMPAN</Button>
            </DialogFooter>
        </form>
    );
};


export default function KasUmumPage() {
    const { toast } = useToast();
    const [data, setData] = React.useState<any[]>([]);
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
            const kasUmum = await getKasUmum();
            setData(kasUmum);
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
            await deleteKasUmum(selectedRows);
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
                await updateKasUmum(item.id, item);
                toast({ title: "Sukses", description: "Data berhasil diperbarui." });
            } else {
                const newId = await addKasUmum(item);
                setData(prev => prev.map(d => d.id.startsWith('temp-') ? { ...item, id: newId } : d));
                toast({ title: "Sukses", description: "Data berhasil ditambahkan." });
            }
        } catch (error) {
            setData(originalData);
            console.error("Failed to save data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data." });
        }
    };

    const filteredData = React.useMemo(() => {
        return dateFilteredData
            .filter(item => selectedKabupaten === "SEMUA" || item.kabupaten === selectedKabupaten)
            .filter((item) =>
                Object.values(item).some((val) =>
                String(val).toUpperCase().includes(searchTerm.toUpperCase())
            )
        );
    }, [dateFilteredData, selectedKabupaten, searchTerm]);
    
    const dataWithSaldo = React.useMemo(() => {
        const dataToProcess = [...filteredData];
        const sorted = dataToProcess.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
        
        const saldoByKabupaten = new Map<string, number>();
        const itemWithSaldo = [];

        for (const item of sorted) {
            const kab = item.kabupaten;
            let runningSaldo = saldoByKabupaten.get(kab) || 0;
            runningSaldo += (item.pemasukan || 0) - (item.pengeluaran || 0);
            saldoByKabupaten.set(kab, runningSaldo);
            itemWithSaldo.push({...item, saldo: runningSaldo});
        }
        
        return itemWithSaldo;
    }, [filteredData]);
    
    const sortedData = React.useMemo(() => {
        let sortableItems = [...dataWithSaldo];
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
    }, [dataWithSaldo, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const totalPages = itemsPerPage > 0 ? Math.ceil(sortedData.length / itemsPerPage) : 1;

    const paginatedData = itemsPerPage > 0
        ? sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : sortedData;

    const totalPemasukan = filteredData.reduce((sum, item) => sum + (item.pemasukan || 0), 0);
    const totalPengeluaran = filteredData.reduce((sum, item) => sum + (item.pengeluaran || 0), 0);
    const saldo = totalPemasukan - totalPengeluaran;

    const handleExportPdf = () => {
        const doc = new jsPDF();
        doc.text("Laporan Kas Umum", 14, 16);
        (doc as any).autoTable({
            head: [['KABUPATEN', 'TANGGAL', 'URAIAN', 'PEMASUKAN', 'PENGELUARAN', 'SALDO']],
            body: sortedData.map(item => [ // Use sortedData to maintain order and saldo
                item.kabupaten,
                formatDate(item.tanggal),
                item.uraian,
                formatCurrency(item.pemasukan),
                formatCurrency(item.pengeluaran),
                formatCurrency(item.saldo),
            ]),
            startY: 20,
        });
        doc.save('laporan_kas_umum.pdf');
    };

    const handleExportXlsx = () => {
        const dataToExport = sortedData.map(item => ({
            'KABUPATEN': item.kabupaten,
            'TANGGAL': formatDate(item.tanggal),
            'URAIAN': item.uraian,
            'PEMASUKAN': item.pemasukan,
            'PENGELUARAN': item.pengeluaran,
            'SALDO': item.saldo,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Kas Umum");
        XLSX.writeFile(workbook, "Laporan_Kas_Umum.xlsx");
    };

    React.useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm, selectedKabupaten, dateFilteredData, itemsPerPage, sortConfig]);

    React.useEffect(() => {
      setDateFilteredData(data);
    }, [data]);


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
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>{editingItem ? 'EDIT' : 'TAMBAH'} DATA KAS UMUM</DialogTitle>
                    </DialogHeader>
                    <FormComponent 
                        item={editingItem} 
                        onSave={handleSave} 
                        onCancel={() => { setIsAddDialogOpen(false); setEditingItem(null); }}
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
              <SortableHeader sortKey="kabupaten" sortConfig={sortConfig} onSort={handleSort}>KABUPATEN</SortableHeader>
              <SortableHeader sortKey="tanggal" sortConfig={sortConfig} onSort={handleSort}>TANGGAL</SortableHeader>
              <SortableHeader sortKey="uraian" sortConfig={sortConfig} onSort={handleSort}>URAIAN</SortableHeader>
              <SortableHeader sortKey="pemasukan" sortConfig={sortConfig} onSort={handleSort}>PEMASUKAN</SortableHeader>
              <SortableHeader sortKey="pengeluaran" sortConfig={sortConfig} onSort={handleSort}>PENGELUARAN</SortableHeader>
              <SortableHeader sortKey="saldo" sortConfig={sortConfig} onSort={handleSort}>SALDO</SortableHeader>
              <TableHead>AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center">Memuat data...</TableCell></TableRow>
            ) : !hasFetchedData ? (
                <TableRow><TableCell colSpan={9} className="text-center">Klik "Tampilkan Data" untuk melihat catatan.</TableCell></TableRow>
            ) : paginatedData.map((item, index) => (
              <TableRow 
                key={item.id}
                className={cn(
                    item.pemasukan > 0 && 'bg-green-100 text-green-900 hover:bg-green-200',
                    item.pengeluaran > 0 && 'bg-red-100 text-red-900 hover:bg-red-200'
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
                <TableCell>{item.uraian}</TableCell>
                <TableCell>{formatCurrency(item.pemasukan)}</TableCell>
                <TableCell>{formatCurrency(item.pengeluaran)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(item.saldo)}</TableCell>
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
