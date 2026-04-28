"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface ChartProps {
    barChartData: any[];
    lineChartData: any[];
}

export function DashboardCharts({ barChartData, lineChartData }: ChartProps) {
    return (
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi per Bulan</CardTitle>
            <CardDescription>Total distribusi pupuk dalam ton selama 6 bulan terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={{
                total: {
                    label: 'Ton',
                    color: 'hsl(var(--chart-1))',
                },
             }} className="h-[300px] w-full">
              <BarChart data={barChartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis />
                <Tooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Penebusan vs Distribusi</CardTitle>
                <CardDescription>Perbandingan total penebusan dan distribusi per bulan.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{
                    redemptions: {
                        label: 'Penebusan',
                        color: 'hsl(var(--chart-1))',
                    },
                    distributions: {
                        label: 'Distribusi',
                        color: 'hsl(var(--chart-2))',
                    },
                }} className="h-[300px] w-full">
                <LineChart data={lineChartData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="redemptions" stroke="var(--color-redemptions)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="distributions" stroke="var(--color-distributions)" strokeWidth={2} dot={false} />
                </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    )
}
