
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
import { FileUp, PlusCircle, Search, Trash2, Pencil, ChevronDown, Store, Banknote } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, toTitleCase, cn } from "@/lib/utils";
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

import { getKiosksWithTagihan, addKiosk, updateKiosk, deleteKiosk as deleteKioskService, addKiosksBatch } from "@/services/kioskService";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Pagination } from "@/components/ui/pagination";

const FormComponent = ({ item, onSave, onCancel }: { item?: any, onSave: (item: any) => void, onCancel: () => void }) => {
    const [formData, setFormData] = React.useState({
        name: "",
        kabupaten: "",
        kecamatan: "",
        desa: "",
        penanggungJawab: "",
        nomorTelepon: "",
        ...item,
    });
    
    React.useEffect(() => {
        if (item) {
            setFormData(item);
        }
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    };

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
                <div><Label htmlFor="name">NAMA KIOS</Label><Input id="name" name="name" value={formData.name} onChange={handleChange} required /></div>
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
                <div><Label htmlFor="kecamatan">KECAMATAN</Label><Input id="kecamatan" name="kecamatan" value={formData.kecamatan} onChange={handleChange} required /></div>
                <div><Label htmlFor="desa">DESA</Label><Input id="desa" name="desa" value={formData.desa} onChange={handleChange} required /></div>
                <div><Label htmlFor="penanggungJawab">PENANGGUNG JAWAB</Label><Input id="penanggungJawab" name="penanggungJawab" value={formData.penanggungJawab} onChange={handleChange} required /></div>
                <div><Label htmlFor="nomorTelepon">NOMOR TELEPON</Label><Input id="nomorTelepon" name="nomorTelepon" value={formData.nomorTelepon} onChange={handleChange} /></div>
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
                <DialogTitle>IMPORT DATA KIOS</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="file">PILIH FILE EXCEL (.XLSX)</Label>
                <Input id="file" type="file" accept=".xlsx" onChange={handleFileChange} />
                <p className="text-sm text-muted-foreground mt-2">
                    Pastikan urutan kolom: `NAMA KIOS`, `KABUPATEN`, `KECAMATAN`, `DESA`, `PENANGGUNG JAWAB`, `NOMOR TELEPON`. Baris header akan diabaikan.
                </p>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={onCancel}>BATAL</Button>
                <Button onClick={handleImportClick} disabled={!file}>IMPORT</Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function KiosksPage() {
    const { toast } = useToast();
    const [data, setData] = React.useState<any[]>([]);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedKabupaten, setSelectedKabupaten] = React.useState("SEMUA");
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
            const kiosks = await getKiosksWithTagihan();
            setData(kiosks);
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
            await Promise.all(selectedRows.map(id => deleteKioskService(id)));
            toast({ title: "Sukses", description: `${itemsToDelete.length} data berhasil dihapus.` });
        } catch (error) {
            setData(originalData);
            console.error("Failed to delete kiosks:", error);
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
            setData(prev => prev.map(d => d.id === item.id ? { ...d, ...item } : d));
        } else {
            const tempId = `temp-${Date.now()}`;
            const newItem = { ...item, id: tempId, tagihan: 0, keterangan: 'LUNAS' };
            setData(prev => [newItem, ...prev]);
        }

        try {
            if (isEditing) {
                await updateKiosk(item.id, item);
                toast({ title: "Sukses", description: "Data berhasil diperbarui." });
            } else {
                const newId = await addKiosk(item);
                setData(prev => prev.map(d => d.id.startsWith('temp-') ? { ...item, id: newId, tagihan: 0, keterangan: 'LUNAS' } : d));
                toast({ title: "Sukses", description: "Data berhasil ditambahkan." });
            }
        } catch (error) {
            setData(originalData);
            console.error("Failed to save kiosk:", error);
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

                const newKiosks = dataRows.map(row => ({
                    name: String(row[0] || '').toUpperCase(),
                    kabupaten: String(row[1] || '').toUpperCase(),
                    kecamatan: String(row[2] || '').toUpperCase(),
                    desa: String(row[3] || '').toUpperCase(),
                    penanggungJawab: String(row[4] || '').toUpperCase(),
                    nomorTelepon: String(row[5] || '').toUpperCase(),
                })).filter(k => k.name && k.kabupaten && k.kecamatan && k.desa && k.penanggungJawab);

                if (newKiosks.length > 0) {
                    await addKiosksBatch(newKiosks);
                    toast({ title: "Sukses", description: `${newKiosks.length} kios berhasil diimpor.` });
                    fetchData();
                } else {
                     toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data valid untuk diimpor. Periksa kembali file Anda." });
                }
            } catch (error) {
                console.error("Failed to import kiosks:", error);
                toast({ variant: "destructive", title: "Error", description: "Gagal mengimpor data. Periksa format file." });
            } finally {
                setIsImportDialogOpen(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };
    
    const sortedData = React.useMemo(() => {
        let sortableItems = [...data];
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
        }
        return sortableItems;
    }, [data, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const filteredData = React.useMemo(() => sortedData
        .filter(item => selectedKabupaten === "SEMUA" || item.kabupaten === selectedKabupaten)
        .filter((item) =>
            Object.values(item).some((val) =>
                String(val).toUpperCase().includes(searchTerm.toUpperCase())
            )
        ), [sortedData, selectedKabupaten, searchTerm]);

    const totalPages = itemsPerPage > 0 ? Math.ceil(filteredData.length / itemsPerPage) : 1;

    const paginatedData = itemsPerPage > 0
        ? filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : filteredData;

    const totalKios = filteredData.length;
    const totalTagihan = filteredData.reduce((sum, item) => sum + item.tagihan, 0);

    const handleExportXlsx = () => {
        const dataToExport = filteredData.map(item => ({
            'NAMA KIOS': item.name,
            'KABUPATEN': item.kabupaten,
            'KECAMATAN': item.kecamatan,
            'DESA': item.desa,
            'PENANGGUNG JAWAB': item.penanggungJawab,
            'NOMOR TELEPON': item.nomorTelepon,
            'TAGIHAN': item.tagihan,
            'KETERANGAN': item.keterangan,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Kios");
        XLSX.writeFile(workbook, "Laporan_Data_Kios.xlsx");
    };

    const handleExportPdf = () => {
        const doc = new jsPDF();
        doc.text("Laporan Data Kios", 14, 16);
        (doc as any).autoTable({
            head: [['NAMA KIOS', 'KABUPATEN', 'KECAMATAN', 'DESA', 'PENANGGUNG JAWAB', 'NOMOR TELEPON', 'TAGIHAN', 'KETERANGAN']],
            body: filteredData.map(item => [
                item.name,
                item.kabupaten,
                item.kecamatan,
                item.desa,
                item.penanggungJawab,
                item.nomorTelepon,
                formatCurrency(item.tagihan),
                item.keterangan
            ]),
            startY: 20,
        });
        doc.save('laporan_data_kios.pdf');
    };

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedKabupaten, itemsPerPage, sortConfig]);


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL KIOS</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKios}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL TAGIHAN</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalTagihan)}</div>
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
                    <DialogTitle>{editingItem ? 'EDIT' : 'TAMBAH'} DATA KIOS</DialogTitle>
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
              <SortableHeader sortKey="name" sortConfig={sortConfig} onSort={handleSort} className="w-[300px]">NAMA KIOS</SortableHeader>
              <SortableHeader sortKey="kabupaten" sortConfig={sortConfig} onSort={handleSort}>KABUPATEN</SortableHeader>
              <SortableHeader sortKey="kecamatan" sortConfig={sortConfig} onSort={handleSort}>KECAMATAN</SortableHeader>
              <SortableHeader sortKey="desa" sortConfig={sortConfig} onSort={handleSort}>DESA</SortableHeader>
              <SortableHeader sortKey="penanggungJawab" sortConfig={sortConfig} onSort={handleSort}>PENANGGUNG JAWAB</SortableHeader>
              <SortableHeader sortKey="nomorTelepon" sortConfig={sortConfig} onSort={handleSort}>NOMOR TELEPON</SortableHeader>
              <SortableHeader sortKey="tagihan" sortConfig={sortConfig} onSort={handleSort}>TAGIHAN KIOS</SortableHeader>
              <SortableHeader sortKey="keterangan" sortConfig={sortConfig} onSort={handleSort}>KETERANGAN</SortableHeader>
              <TableHead>AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center">Memuat data...</TableCell></TableRow>
            ) : !hasFetchedData ? (
                <TableRow><TableCell colSpan={11} className="text-center">Klik "Tampilkan Data" untuk melihat catatan.</TableCell></TableRow>
            ) : paginatedData.map((item, index) => (
              <TableRow 
                key={item.id}
                className={cn(item.tagihan > 0 && 'bg-red-100 text-red-900 hover:bg-red-200')}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(item.id)}
                    onCheckedChange={() => handleSelectRow(item.id)}
                  />
                </TableCell>
                <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.kabupaten}</TableCell>
                <TableCell>{item.kecamatan}</TableCell>
                <TableCell>{item.desa}</TableCell>
                <TableCell>{item.penanggungJawab}</TableCell>
                <TableCell>{item.nomorTelepon}</TableCell>
                <TableCell>{formatCurrency(item.tagihan)}</TableCell>
                <TableCell>{item.keterangan}</TableCell>
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

    