self.importScripts('/spark-md5.min.js');
self.onmessage = (e) => {
  const { chunkList } = e.data;
  // @ts-expect-error ignore
  const spark = new self.SparkMD5.ArrayBuffer();
  let percentage = 0;
  let count = 0;
  const loadNext = (index) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(chunkList[index].chunk);
    reader.onload = (event) => {
      count++;
      spark.append(event.target?.result);
      if (count === chunkList.length) {
        self.postMessage({
          percentage: 100,
          hash: spark.end(),
        });
        self.close();
      } else {
        percentage += 100 / chunkList.length;
        self.postMessage({
          percentage,
        });
        loadNext(count);
      }
    };
  };
  loadNext(count);
};
