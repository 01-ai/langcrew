import React, { FC, ReactNode } from 'react';
import { List, ListProps } from 'antd';
import SearchIcon from '@/assets/svg/search.svg?react';
import './style.less';

interface RecordType {
  link: string;
  title: string;
  icon?: ReactNode;
  description?: string;
}

interface SearchProps extends ListProps<RecordType> {
  data?: RecordType[];
}

const Search: FC<SearchProps> = ({ data, ...props }) => {
  return (
    <List
      className="w-full h-full overflow-y-auto chat-scrollbar"
      {...props}
      dataSource={data || props.dataSource}
      renderItem={(item: RecordType) => (
        <List.Item>
          <List.Item.Meta
            className="px-3"
            title={
              <a
                href={item.link}
                title={item.title}
                target="_blank"
                rel="noreferrer"
                className="search-title font-medium"
              >
                {!item.icon && <img src={`https://www.google.com/s2/favicons?domain=${item.link}&sz=32`} />}
                {typeof item.icon === 'string' && item.icon && <img src={item.icon} alt="" />}
                {typeof item.icon !== 'string' && item.icon}
                {item.title}
              </a>
            }
            description={<p className="search-description">{item.description}</p>}
          />
        </List.Item>
      )}
    />
  );
};

export default Search;
