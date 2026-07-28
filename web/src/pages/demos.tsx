import React, { FC, useEffect, useRef, useState } from 'react';
import { Anchor, Card, Flex, Input, notification } from 'antd';

import FileReader from '@/components/Infra/FileReader';
import ImageViewer from '@/components/Infra/ImageViewer';
import VideoPlayer from '@/components/Infra/VideoPlayer';
import Search from '@/components/Infra/Search';
import { UserOutlined } from '@ant-design/icons';
import Markdown from '@/components/Infra/Markdown';
import SingleSelectQuestion from '@/registry/user_input/SingleSelectQuestion';
import MultiSelectQuestion from '@/registry/user_input/MultiSelectQuestion';

const markdownContent = `
## Health information

1. Is there any information about the insured person?:
  - He applied for or received a claim for cancer or major illness insurance
  - In the last two years, insurance companies have refused or renewed life insurance or reinstatement applications.
2. The insured are currently applying for insurance.(Including the insurance policy.)and whether the cumulative coverage for life insurance in effect is greater400Thousand?
3. Whether the insured person is or has been suffering from the following diseases::
  - Malignant neoplasms: Malignant neoplasms(It's leukaemia, lymphoma.)
  - Brain and spirit.: Brain stroke, cerebrovascular tumor or malformation, epilepsy, mental disorders, depression, depression, anxiety, anxiety, schizophrenia
  - Cardio-pulmonary diseases: Coronary heart disease, myocardial infarction, pulmonary heart disease, expansion of heart, heart failure above level 2, respiratory failure, pulmonary swelling or knot
  - Blood pressure sugar.: Diabetes, hypertension above level 2(High pressure in the absence of medication>160mmHgOr low pressure.>100mmHg)
  - Hepatitis and kidney diseases:Hepatitis B and liver function(ALT、AST)Unusual, hepatitis C, alcohol hepatitis, cirrhosis of the liver, chronic kidney, multiple kidneys, incomplete kidneys
  - Blood is rheumatized.: Re-infective anaemia, systematic red chords, haemophilia(Medium or heavy)
  - Physical function: Blindness, paralysis, deafness, physical loss(Upper limbs with elbows and lower limbs above knee joints)
  - Other diseases: Breast noose.(ExcludedBI-RADS1-3Classes)、Chronic alcohol poisoning, HIV/AIDS, severe myocardia, multiple sclerosis, hepato-beans nucleus, muscle malnutrition, organ transplant
4. The insured person has a dangerous appetite or engages in hazardous activities, such as:Racers, horses racing, skiing, rock climbing, booming, diving, boxing, martial arts, wrestling, adventure or stunting and other high-risk activities
5. Whether the insured person currently engages in the following occupations:
  - High-altitude operators, flammable/It's explosive./Dangerous drivers, high-voltage electricians, lifeguards, divers, fireworks and fireworks, miners, blasters(Notes:If they have been employed in these occupations, but they have been converted to other occupations, they may be insured.)

`;

const singleSelectOptions = ['Options A：I\'m very satisfied.', 'Options B：I\'m more satisfied.', 'Options C：General', 'Options D：Unsatisfactory'];

const Demos: FC = () => {
  const file = createFile('file.pdf', 'demo pdf texts', 'application/pdf');

  const [markdown, setMarkdown] = useState(markdownContent);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = (target as HTMLElement).offsetTop;
    }
  }, []);

  return (
    <div className="h-full overflow-hidden flex">
      <Anchor
        className="shrink-0 p-4"
        getContainer={() => scrollContainerRef.current ?? window}
        items={[
          { key: 'markdown', href: '#markdown', title: 'Markdown' },
          { key: 'file-reader', href: '#file-reader', title: 'FileReader' },
          { key: 'search', href: '#search', title: 'Search' },
          { key: 'video-player', href: '#video-player', title: 'VideoPlayer' },
          { key: 'image-viewer', href: '#image-viewer', title: 'ImageViewer' },
          { key: 'single-select', href: '#single-select', title: 'SingleSelectQuestion' },
          { key: 'multi-select', href: '#multi-select', title: 'MultiSelectQuestion' },
        ]}
      />
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div id="markdown" className="p-2 bg-white flex gap-2">
          <div className="flex-1 overflow-y-auto">
            <Input.TextArea
              rows={10}
              defaultValue={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full h-full"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Markdown content={markdown} />
          </div>
        </div>
        <Card id="file-reader">
          <FileReader url="https://www.orimi.com/pdf-test.pdf" />
        </Card>
        <Card>
          <FileReader url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" />
        </Card>
        <Card>
          <FileReader url="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png?page=3" />
        </Card>
        <Card>
          {/* <FileDetailRenderer
          type="1"
          content="2"
          data={{
            url: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
          }}
        /> */}
        </Card>
        <Card id="search">
          <Search
            data={[
              {
                title: 'ChengduAIThe artificial intelligence fair is scheduled_Locations',
                link: 'http://path',
                icon: <UserOutlined />,
                description:
                  'City of ChengAIThe AIS fair is a platform for the display of the latest products, technologies and innovation programs....',
              },
              {
                title: '2025Chengdu International Data Centre and Cloud Calculator Industry Fair--Official network',
                link: 'http://path',
                icon: 'https://placehold.co/100x100',
                description:
                  '2025Chengdu International Data Centre and Cloud Calculator Industry Fair(CIDCIE-2025)Will2025Year7Month9-11It\'s a big event at the New International Convention Fair in Chengdu City.,CIDCIEIt\'s about data....',
              },
              {
                title: 'Central-West Labour Fair-Overview of the exhibit',
                link: 'http://path',
                description:
                  '2025The Yearning World Industrial Fair-Chengdu International Industrial Fair will be held at the4Month23-25The World Cup is a new event in the West China.,Through displays of smart manufacturing, new generation of information technology, metals and engineering, energy efficiency and energy efficiency...',
              },
              {
                title: '2025GSMAChengdu is the playAITerminal innovation',
                link: 'http://path',
                description:
                  'Date:2025Year2Month20Day(Thursday)Time:13:30-19:00(Greenwich Time.+8)Locations:The Astronomer of the Chengdu Rage Hotel.AOffice.GSMAIt\'s a united mobile ecosystem.',
              },
              {
                title: '2025Zong Dang·AIThe entire intellectual robotics show is held at the Sichuan Theatre.',
                link: 'http://path',
                description:
                  '2025Zong DangAIThe intellectual robots\' general fair was carefully prepared over a year.,Chengdu stands on2Month2Period from2Month7This is an exhibition.,We led you into the wonder world of robots.',
              },
            ]}
          />
        </Card>
        <Card>
          {/* <FileReader className="custom-document-viewer" url="http://www.pdf995.com/samples/pdf.pdf" />
        <FileReader className="custom-document-viewer" file={file} /> */}
        </Card>
        <Card id="video-player">
          <h3>VideoPlayer</h3>
          <VideoPlayer
            controls
            url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4"
          />
        </Card>
        <Card id="image-viewer">
          <h3>ImageViewer Simple Case</h3>
          <ImageViewer src="https://placehold.co/100x100" />

          <h3>ImageViewer Multi Case</h3>
          <ImageViewer srcs={['https://placehold.co/100x100', 'https://placehold.co/100x100']} />

          <h3>ImageViewer Group/Album Case</h3>
          <ImageViewer
            group
            groupOptions={{ items: ['https://placehold.co/500x500', 'https://placehold.co/300x300'] }}
            src="https://placehold.co/100x100"
          />
        </Card>
        <Card id="single-select">
          <h3 className="mb-4 text-base font-semibold">SingleSelectQuestion</h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="mb-2 text-sm text-gray-500">No Selection</p>
              <SingleSelectQuestion
                options={singleSelectOptions}
                interactive
                prompt={<p className="font-medium text-base text-black">Please choose the level of satisfaction you have with this service.</p>}
                onSubmit={(value) => notification.success({ message: `Submitted:${value}` })}
              />
            </div>
            <div>
              <p className="mb-2 text-sm text-gray-500">Revert Preset Options</p>
              <SingleSelectQuestion
                options={singleSelectOptions}
                interactive={false}
                initialValue="Options B：I'm more satisfied."
                prompt={<p className="font-medium text-base text-black">Please choose the level of satisfaction you have with this service.</p>}
                onSubmit={() => {}}
              />
            </div>
            <div>
              <p className="mb-2 text-sm text-gray-500">Revert custom options</p>
              <SingleSelectQuestion
                options={singleSelectOptions}
                interactive={false}
                initialValue="This is a custom answer."
                prompt={<p className="font-medium text-base text-black">Please choose the level of satisfaction you have with this service.</p>}
                onSubmit={() => {}}
              />
            </div>
            <div>
              <p className="mb-2 text-sm text-gray-500">Users input box text (no return)</p>
              <SingleSelectQuestion
                options={singleSelectOptions}
                interactive={false}
                prompt={<p className="font-medium text-base text-black">Please choose the level of satisfaction you have with this service.</p>}
                onSubmit={() => {}}
              />
            </div>
          </div>
        </Card>
        <Card id="multi-select">
          <h3 className="mb-4 text-base font-semibold">MultiSelectQuestion</h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="mb-2 text-sm text-gray-500">No Selection</p>
              <MultiSelectQuestion
                options={singleSelectOptions}
                interactive
                prompt={<p className="font-medium text-base text-black">Select the fields of interest to you (multiple options)</p>}
                onSubmit={(values) => notification.success({ message: `Submitted:${values.join('、')}` })}
              />
            </div>
            <div>
              <p className="mb-2 text-sm text-gray-500">Revert Selected</p>
              <MultiSelectQuestion
                options={singleSelectOptions}
                interactive={false}
                initialValues={['Options A：I\'m very satisfied.', 'Options C：General']}
                prompt={<p className="font-medium text-base text-black">Select the fields of interest to you (multiple options)</p>}
                onSubmit={() => {}}
              />
            </div>
            <div>
              <p className="mb-2 text-sm text-gray-500">Users input box text (no return)</p>
              <MultiSelectQuestion
                options={singleSelectOptions}
                interactive={false}
                prompt={<p className="font-medium text-base text-black">Select the fields of interest to you (multiple options)</p>}
                onSubmit={() => {}}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Demos;

function createFile(fileName = 'demo.txt', content = 'hello world', type = 'text/plain') {
  return new File([content], fileName, {
    type,
    lastModified: Date.now(),
  });
}
