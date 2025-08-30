import { createCanvas } from "canvas";
import { init, setPlatformAPI } from "echarts";

// Register canvas renderer for server-side rendering
setPlatformAPI({
  // @ts-ignore
  createCanvas: () => createCanvas(1, 1),
  measureText: (text: string, font: string) => {
    const canvas = createCanvas(1, 1);
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    return ctx.measureText(text);
  },
  // @ts-ignore
  loadImage: (src: string) => {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },
});

interface ChartData {
  type: string;
  title?: string;
  xAxis?: {
    categories?: string[];
    title?: string;
  };
  yAxis?: {
    title?: string;
  };
  series: Array<{
    name: string;
    data: number[] | Array<{ x: number; y: number }>;
    type?: string;
  }>;
}

async function generateChart(chartData: ChartData): Promise<Buffer> {
  // Create a canvas with higher resolution for better visual quality
  const canvas = createCanvas(1200, 800);
  // const ctx = canvas.getContext('2d');

  // Initialize ECharts with the canvas
  const chart = init(canvas as any, null, {
    renderer: "canvas",
    useDirtyRect: false,
  });

  // Convert our schema to ECharts format
  const option = {
    backgroundColor: {
      type: "radial" as const,
      x: 0.5,
      y: 0.5,
      r: 0.8,
      colorStops: [
        { offset: 0, color: "#1a1d29" },
        { offset: 0.4, color: "#2a2d3a" },
        { offset: 1, color: "#36393f" },
      ],
    },
    animation: false,
    title: {
      text: chartData.title || "",
      left: "center",
      top: 25,
      textStyle: {
        color: "#ffffff",
        fontSize: 22,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(47, 49, 54, 0.95)",
      borderColor: "#00d4ff",
      borderWidth: 2,
      textStyle: {
        color: "#ffffff",
        fontSize: 14,
      },
    },
    legend: {
      show: false,
    },
    grid: {
      left: 60,
      right: 40,
      top: 80,
      bottom: 70,
      containLabel: true,
      backgroundColor: "rgba(255, 255, 255, 0.03)",
      borderColor: "rgba(0, 212, 255, 0.2)",
      borderWidth: 1,
    },
    xAxis: {
      type: "category",
      data:
        chartData.xAxis?.categories ||
        chartData.series[0]?.data.map((_, i) => `Item ${i + 1}`),
      name: chartData.xAxis?.title || "",
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: "#00d4ff",
          width: 2,
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: "#00d4ff",
          width: 2,
        },
      },
      axisLabel: {
        show: true,
        color: "#e3e5e8",
        fontSize: 11,
        fontWeight: "500",
        rotate: 30,
      },
    },
    yAxis: {
      type: "value",
      name: chartData.yAxis?.title || "",
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: "#00d4ff",
          width: 2,
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: "#00d4ff",
          width: 2,
        },
      },
      axisLabel: {
        show: true,
        color: "#e3e5e8",
        fontSize: 12,
        fontWeight: "500",
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(0, 212, 255, 0.15)",
          type: "dashed",
          width: 1,
        },
      },
    },
    series: chartData.series.map((series) => ({
      name: series.name,
      type: chartData.type,
      data: series.data,
      smooth: chartData.type === "line",
      smoothMonotone: "x",
      symbol: "circle",
      symbolSize: 10,
      showSymbol: true,
      lineStyle:
        chartData.type === "line"
          ? {
              width: 4,
              color: {
                type: "linear" as const,
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#00d4ff" },
                  { offset: 0.25, color: "#4facfe" },
                  { offset: 0.5, color: "#00f2fe" },
                  { offset: 0.75, color: "#43e97b" },
                  { offset: 1, color: "#38f9d7" },
                ],
              },
            }
          : undefined,
      itemStyle: {
        color: {
          type: "radial" as const,
          x: 0.5,
          y: 0.5,
          r: 0.8,
          colorStops: [
            { offset: 0, color: "#ffffff" },
            { offset: 0.7, color: "#00d4ff" },
            { offset: 1, color: "#4facfe" },
          ],
        },
        borderWidth: 3,
        borderColor: "#ffffff",
      },
      emphasis: {
        focus: "series",
        itemStyle: {
          borderWidth: 4,
          shadowBlur: 20,
        },
      },
      markPoint: {
        data: [
          {
            coord: [
              series.data.length - 1,
              series.data[series.data.length - 1],
            ],
            name: "Current",
            itemStyle: {
              color: "#00ff88",
              borderColor: "#ffffff",
              borderWidth: 3,
              shadowColor: "rgba(0, 255, 136, 0.8)",
              shadowBlur: 20,
            },
          },
        ],
        symbol: "circle",
        symbolSize: 16,
        label: {
          show: true,
          position: "top",
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: 14,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderColor: "#00ff88",
          borderWidth: 1,
          borderRadius: 6,
          padding: [4, 8],
          formatter: (params: any) => {
            const value = params.data.coord[1];
            return `${value} pts`;
          },
        },
      },
      areaStyle:
        chartData.type === "line"
          ? {
              opacity: 0.3,
              color: {
                type: "linear" as const,
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(0, 212, 255, 0.6)" },
                  { offset: 0.3, color: "rgba(79, 172, 254, 0.4)" },
                  { offset: 0.7, color: "rgba(67, 233, 123, 0.2)" },
                  { offset: 1, color: "rgba(56, 249, 215, 0.1)" },
                ],
              },
            }
          : undefined,
    })),
  };

  // Set the option and force render
  chart.setOption(option);

  // Force a render cycle
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Get the canvas buffer as PNG
  const buffer = canvas.toBuffer("image/png");

  // Dispose the chart
  chart.dispose();

  return buffer;
}

Bun.serve({
  port: 3001,
  routes: {
    "/user-points": {
      GET: async (req: Request) => {
        try {
          const url = new URL(req.url);
          const discordId = url.searchParams.get("discord_id");

          if (!discordId) {
            return new Response(
              JSON.stringify({ error: "discord_id parameter is required" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Fetch user points data from API
          const apiResponse = await fetch(
            `${Bun.env.ZHENPAI_API_URL}/user_points?discord_id=${discordId}`
          );

          if (!apiResponse.ok) {
            return new Response(
              JSON.stringify({ error: "Failed to fetch user points data" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const userData = await apiResponse.json();

          // Generate fixed 14-day date range for consistent X axis
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 13); // 14 days total

          const categories = [];
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            categories.push(currentDate.toLocaleDateString());
            currentDate.setDate(currentDate.getDate() + 1);
          }

          // Map user's points history to the fixed date range
          // @ts-ignore
          const pointsHistory = userData.points_history || [];
          const pointsMap = new Map();

          // Build map of timestamp -> running_balance (preserves multiple entries per day)
          pointsHistory.forEach((entry: any) => {
            const entryTimestamp = new Date(entry.created_at).getTime();
            pointsMap.set(entryTimestamp, entry.running_balance);
          });

          // Fill data array with user's balance for each date, carrying forward last known balance
          const runningBalanceData = [];

          // Find the starting balance (last known balance before the 7-day period)
          let lastBalance = 0;

          // Sort points history by date to find the most recent balance before our date range
          const sortedHistory = pointsHistory.sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );

          for (const entry of sortedHistory) {
            const entryDate = new Date(entry.created_at);
            if (entryDate < startDate) {
              lastBalance = entry.running_balance;
            } else {
              break;
            }
          }

          for (const date of categories) {
            // Find the most recent balance for this date from all entries
            const dayStart = new Date(date).getTime();
            const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1; // End of day

            // Get all entries for this day and find the latest one
            let latestBalanceForDay = null;
            let latestTimestamp = 0;

            for (const [timestamp, balance] of pointsMap) {
              if (
                timestamp >= dayStart &&
                timestamp <= dayEnd &&
                timestamp > latestTimestamp
              ) {
                latestTimestamp = timestamp;
                latestBalanceForDay = balance;
              }
            }

            if (latestBalanceForDay !== null) {
              lastBalance = latestBalanceForDay;
            }
            runningBalanceData.push(lastBalance);
          }

          const chartData: ChartData = {
            type: "line",
            // title: `Points Balance for ${
            //   // @ts-ignore
            //   userData.user_info?.discord_username || "User"
            // }`,
            xAxis: {
              categories,
              title: "Date",
            },
            yAxis: {
              title: "Points Balance",
            },
            series: [
              {
                name: "Running Balance",
                data: runningBalanceData,
              },
            ],
          };

          const pngBuffer = await generateChart(chartData);

          return new Response(new Uint8Array(pngBuffer), {
            headers: {
              "Content-Type": "image/png",
            },
          });
        } catch (error) {
          console.error("User points chart generation error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to generate user points chart" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
    "/": {
      GET: () => {
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

console.log("Chart server running on PORT 3001");
