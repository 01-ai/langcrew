import React, { useState } from 'react';
import { Button, Space, Card, Statistic, Row, Col } from 'antd';
import FileContentRender from '@/components/Infra/FileContentRender';

/**
 * Virtual scroll test page
 * Test for large file rendering
 */
const VirtualScrollTest: React.FC = () => {
  const [testContent, setTestContent] = useState<string>('');
  const [testType, setTestType] = useState<string>('');
  const [contentStats, setContentStats] = useState<{
    size: number;
    lines: number;
    renderTime: number;
  } | null>(null);

  // Generate Large Markdown Documentation
  const generateLargeMarkdown = (sizeMB: number) => {
    const startTime = performance.now();
    const lines: string[] = [];
    const targetSize = sizeMB * 1024 * 1024; // Target bytes

    // Generate all types Markdown Contents
    // Each iterative contract generation 1KB Content, so it's necessary sizeMB * 1024 Secondary
    const iterations = sizeMB * 1024;

    for (let i = 0; i < iterations; i++) {
      // Title
      lines.push(`# Chapter ${i + 1}
`);

      // More paragraph content (3-4(Speaks English)
      lines.push(
        `This is the first. ${i + 1} Details of the paragraphs. This paragraph contains various formats:**Bold Text**、*Italic Text*、` +
        `\`Line code\`and[Example of links](https://example.com)。In this way, we can generate more closely to the actual document.` +
        `So you can test virtual scroll performance more accurately. The document may also contain special characters and point symbols!
`
      );
      lines.push('');

      // Secondary Titles and Lists
      lines.push('## Function Characteristics List');
      lines.push('');
      lines.push('The following are the main elements of this section:');
      lines.push('');
      lines.push('- **Feature 1**：Supports large document rendering optimization');
      lines.push('- **Feature 2**：Virtual scroll technology application');
      lines.push('- **Feature 3**：Smart Layer Resolution Policy');
      lines.push('- **Feature 4**：Multilingual internationalization support');
      lines.push('- **Feature 5**：Automatic downgrading mechanisms to ensure stability');
      lines.push('');

      // Larger code blocks (for example, real codes)
      lines.push('### Example code');
      lines.push('');
      lines.push('```javascript');
      lines.push(`// Example Functions #${i + 1}`);
      lines.push(`function processData${i}(items) {`);
      lines.push(`  const result = items.map((item, index) => {`);
      lines.push(`    return {`);
      lines.push(`      id: index,`);
      lines.push(`      value: item * 2,`);
      lines.push(`      timestamp: Date.now(),`);
      lines.push(`      metadata: { type: 'processed', version: '1.0' }`);
      lines.push(`    };`);
      lines.push(`  });`);
      lines.push(`  console.log('Processing complete, total ' + result.length + ' Bar Data');`);
      lines.push(`  return result.filter(r => r.value > 0);`);
      lines.push(`}`);
      lines.push('```');
      lines.push('');

      // Reference Blocks
      if (i % 3 === 0) {
        lines.push('> **Important tip**：The functions described in this section need to be carefully tested in the production environment.');
        lines.push('> Please ensure that all dependencies are installed and configured correctly.');
        lines.push('');
      }

      // More complex tables
      lines.push('### Data comparison tables');
      lines.push('');
      lines.push('| Numbering | Name | Type | Status | Remarks |');
      lines.push('|------|------|------|------|------|');
      lines.push(`| ${i * 3 + 1} | ItemA-${i} | Type1 | Active | Active |`);
      lines.push(`| ${i * 3 + 2} | ItemB-${i} | Type2 | Pending | Pending review |`);
      lines.push(`| ${i * 3 + 3} | ItemC-${i} | Type3 | Completed | Test passed. |`);
      lines.push('');

      // Separator
      lines.push('---');
      lines.push('');
    }

    let content = lines.join('\n');

    // Verify and resize to ensure target size (permissive) ±5% (Incurred)
    let actualSize = new Blob([content]).size;
    const minSize = targetSize * 0.95;
    const maxSize = targetSize * 1.05;

    // Add fill if not sufficient
    let fillIndex = 0;
    while (actualSize < minSize) {
      const filler = `

## Fill Chapter ${fillIndex++}\n\n` +
        `This is the filling that you add to the size of the target file. Virtual scrolling technology can handle large documents effectively.` +
        `Increase performance by reproducing only the contents of the visible area. Even if the file is dozens of sizesMB，User experience is still fluid.` +
        `The system uses an intelligent layering policy to automatically select the best resolution and rendering options according to file size.
`;
      content += filler;
      actualSize = new Blob([content]).size;
    }

    // If it's too much, intercept it.
    if (actualSize > maxSize) {
      const ratio = maxSize / actualSize;
      const targetLength = Math.floor(content.length * ratio);
      content = content.substring(0, targetLength);
      actualSize = new Blob([content]).size;
    }

    const endTime = performance.now();

    setContentStats({
      size: new Blob([content]).size,
      lines: content.split('\n').length,
      renderTime: endTime - startTime,
    });

    setTestContent(content);
    setTestType('md');
  };

  // Generate Large CSV Documentation
  const generateLargeCSV = (rowCount: number) => {
    const startTime = performance.now();
    const lines: string[] = ['Columns1,Columns2,Columns3,Columns4,Columns5,Columns6'];

    for (let i = 0; i < rowCount; i++) {
      lines.push(`Data${i}-1,Data${i}-2,Data${i}-3,Data${i}-4,Data${i}-5,Data${i}-6`);
    }

    const content = lines.join('\n');
    const endTime = performance.now();

    setContentStats({
      size: new Blob([content]).size,
      lines: lines.length,
      renderTime: endTime - startTime,
    });

    setTestContent(content);
    setTestType('csv');
  };

  const clearTest = () => {
    setTestContent('');
    setTestType('');
    setContentStats(null);
  };

  return (
    <div className="p-6 h-full overflow-scroll">
      <h1 className="text-2xl font-bold mb-6">Virtual scroll performance test</h1>

      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Test Example</h3>
        <Space wrap>
          <Button onClick={() => generateLargeMarkdown(1)}>Generate 1MB Markdown</Button>
          <Button onClick={() => generateLargeMarkdown(2)}>Generate 2MB Markdown</Button>
          <Button onClick={() => generateLargeMarkdown(5)}>Generate 5MB Markdown</Button>
          <Button onClick={() => generateLargeMarkdown(10)}>Generate 10MB Markdown</Button>
          <Button onClick={() => generateLargeMarkdown(20)}>Generate 20MB Markdown</Button>
          <Button type="dashed" onClick={() => generateLargeCSV(10000)}>

            Generate 10K Okay. CSV
          </Button>
          <Button type="dashed" onClick={() => generateLargeCSV(50000)}>

            Generate 50K Okay. CSV
          </Button>
          <Button type="dashed" onClick={() => generateLargeCSV(100000)}>

            Generate 100K Okay. CSV
          </Button>
          <Button danger onClick={clearTest}>

            Clear
          </Button>
        </Space>
      </Card>

      {contentStats && (
        <Card className="mb-6">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="File Size" value={(contentStats.size / 1024 / 1024).toFixed(2)} suffix="MB" />
            </Col>
            <Col span={6}>
              <Statistic title="Lines" value={contentStats.lines} />
            </Col>
            <Col span={6}>
              <Statistic title="Generate time-consuming" value={contentStats.renderTime.toFixed(2)} suffix="ms" />
            </Col>
            <Col span={6}>
              <Statistic title="File type" value={testType.toUpperCase()} />
            </Col>
          </Row>
        </Card>
      )}

      {testContent && (
        <Card
          title={`Test Rendering - ${testType.toUpperCase()}`}
          className="mb-6"
          style={{ height: '800px', display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ flex: 1, overflow: 'hidden', padding: 0 }}
        >
          <FileContentRender fileContent={testContent} fileExtension={testType} />
        </Card>
      )}

      {!testContent && (
        <Card>
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg">Click on the top button to generate the test file</p>
            <p className="mt-2">Test virtual scroll performance</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default VirtualScrollTest;
