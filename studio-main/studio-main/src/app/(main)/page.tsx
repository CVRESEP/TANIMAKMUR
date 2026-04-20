
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Truck, Package, Store, Loader2 } from "lucide-react";
import { getDashboardData } from "@/services/dashboardService";
import { formatCurrency } from "@/lib/utils";
import { DashboardCharts } from "@/components/DashboardCharts";

export default function Dashboard() {
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFetchData = async () => {
    setIsLoading(true);
    try {
      const dashboardData = await getDashboardData();
      setData(dashboardData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      // Handle error display if needed
    } finally {
      setIsLoading(false);
    }
  };

  const { stats, barChartData, lineChartData } = data || { stats: {}, barChartData: [], lineChartData: [] };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
       <div className="flex justify-end">
        <Button onClick={handleFetchData} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          TAMPILKAN DATA
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Penebusan
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalPenebusan || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Berdasarkan semua data
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Distribusi
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDistribusi || 0} Ton</div>
             <p className="text-xs text-muted-foreground">
              Berdasarkan semua data
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Tersisa</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.saldoTersisa || 0} Ton</div>
             <p className="text-xs text-muted-foreground">
              Total Penebusan - Total Distribusi
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kios Terdaftar</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.jumlahKios || 0}</div>
             <p className="text-xs text-muted-foreground">
              Total kios di semua kabupaten
            </p>
          </CardContent>
        </Card>
      </div>
      <DashboardCharts barChartData={barChartData} lineChartData={lineChartData} />
    </main>
  );
}
