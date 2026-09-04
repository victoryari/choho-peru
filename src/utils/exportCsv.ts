export function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) return;

  const header = Object.keys(data[0]).join(",");
  const csv = data.map(row => {
    return Object.values(row).map(val => {
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(",");
  });
  
  const csvString = [header, ...csv].join("\n");
  const blob = new Blob(["\ufeff" + csvString], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
