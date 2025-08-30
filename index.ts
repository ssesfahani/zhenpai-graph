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
  // Create a canvas
  const canvas = createCanvas(800, 600);
  // const ctx = canvas.getContext('2d');

  // Initialize ECharts with the canvas
  const chart = init(canvas as any, null, {
    renderer: "canvas",
    useDirtyRect: false,
  });

  // Convert our schema to ECharts format
  const option = {
    backgroundColor: "#36393f",
    animation: false,
    title: {
      text: chartData.title || "",
      left: "center",
      top: 20,
      textStyle: {
        color: "#dcddde",
        fontSize: 18,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#2f3136",
      borderColor: "#72767d",
      textStyle: {
        color: "#dcddde",
      },
    },
    legend: {
      show: false,
    },
    grid: {
      left: 30,
      right: 20,
      top: 20,
      bottom: 30,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data:
        chartData.xAxis?.categories ||
        chartData.series[0]?.data.map((_, i) => `Item ${i + 1}`),
      name: chartData.xAxis?.title || "",
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: {
        color: "#dcddde",
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: "#72767d",
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: "#72767d",
        },
      },
      axisLabel: {
        show: true,
        color: "#b9bbbe",
      },
    },
    yAxis: {
      type: "value",
      name: chartData.yAxis?.title || "",
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: {
        color: "#dcddde",
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: "#72767d",
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: "#72767d",
        },
      },
      axisLabel: {
        show: true,
        color: "#b9bbbe",
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "#40444b",
          type: "dashed",
        },
      },
    },
    series: chartData.series.map((series) => ({
      name: series.name,
      type: chartData.type,
      data: series.data,
      smooth: chartData.type === "line",
      lineStyle: chartData.type === "line" ? { width: 2 } : undefined,
      itemStyle: {
        borderWidth: 1,
        borderColor: "#fff",
      },
      emphasis: {
        focus: "series",
      },
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
