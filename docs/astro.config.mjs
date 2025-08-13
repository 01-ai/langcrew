// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'langcrew',
			description: 'A powerful framework for building AI agent crews',
			locales: {
				root: {
					label: 'English',
					lang: 'en',
				},
				zh: {
					label: '简体中文',
					lang: 'zh-CN',
				},
			},
			logo: {
				src: './src/assets/langcrew-logo.svg',
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/01-ai/langcrew' }
			],
			sidebar: [
				{
					label: '快速开始',
					translations: {
						en: 'Getting Started'
					},
					items: [
						{
							label: '介绍',
							link: '/guides/introduction',
							translations: {
								en: 'Introduction'
							}
						},
						{
							label: '安装',
							link: '/guides/installation',
							translations: {
								en: 'Installation'
							}
						},
						{
							label: '快速开始',
							link: '/guides/quickstart',
							translations: {
								en: 'Quick Start'
							}
						},
					],
				},
				{
					label: '核心概念',
					translations: {
						en: 'Core Concepts'
					},
					items: [
						{
							label: '智能体',
							link: '/concepts/agents',
							translations: {
								en: 'Agents'
							}
						},
						{
							label: '任务',
							link: '/concepts/tasks',
							translations: {
								en: 'Tasks'
							}
						},
						{
							label: '团队',
							link: '/concepts/crews',
							translations: {
								en: 'Crews'
							}
						},
						{
							label: '内存管理',
							link: '/concepts/memory',
							translations: {
								en: 'Memory'
							}
						},
						{
							label: '人机协作',
							link: '/concepts/hitl',
							translations: {
								en: 'Human-in-the-Loop'
							}
						},
						{
							label: '工具系统',
							link: '/concepts/tools',
							translations: {
								en: 'Tools'
							}
						},
						{
							label: 'Web服务',
							link: '/concepts/web',
							translations: {
								en: 'Web'
							}
						},
					],
				},
				{
					label: '实践指南',
					translations: {
						en: 'Guides'
					},
					items: [
						{
							label: '内存管理',
							translations: {
								en: 'Memory'
							},
							items: [
								{
									label: '快速开始',
									link: '/guides/memory/getting-started',
									translations: {
										en: 'Getting Started'
									}
								},
								{
									label: '短期记忆',
									link: '/guides/memory/short-term',
									translations: {
										en: 'Short-term Memory'
									}
								},
								{
									label: '长期记忆',
									link: '/guides/memory/long-term',
									translations: {
										en: 'Long-term Memory'
									}
								},
								{
									label: '实体记忆',
									link: '/guides/memory/entity',
									translations: {
										en: 'Entity Memory'
									}
								},
								{
									label: '存储配置',
									link: '/guides/memory/storage',
									translations: {
										en: 'Storage'
									}
								},
							]
						},
						{
							label: '人机协作',
							translations: {
								en: 'Human-in-the-Loop'
							},
							items: [
								{
									label: '快速开始',
									link: '/guides/hitl/getting-started',
									translations: {
										en: 'Getting Started'
									}
								},
								{
									label: '配置指南',
									link: '/guides/hitl/configuration',
									translations: {
										en: 'Configuration'
									}
								},
							]
						},
						{
							label: '工具系统',
							translations: {
								en: 'Tools'
							},
							items: [
								{
									label: '工具注册',
									link: '/guides/tools/tool-registry',
									translations: {
										en: 'Tool Registry'
									}
								},
								{
									label: '工具转换',
									link: '/guides/tools/tool-converter',
									translations: {
										en: 'Tool Converter'
									}
								},
								{
									label: 'MCP 集成',
									link: '/guides/tools/tool-mcp',
									translations: {
										en: 'MCP Integration'
									}
								},
							]
						},
						{
							label: 'Web服务',
							translations: {
								en: 'Web'
							},
							items: [
								{
									label: 'HTTP服务器',
									link: '/guides/web/http-server',
									translations: {
										en: 'HTTP Server'
									}
								},
								{
									label: '流式协议',
									link: '/guides/web/streaming',
									translations: {
										en: 'Streaming'
									}
								},
								{
									label: 'LangGraph集成',
									link: '/guides/web/langgraph-integration',
									translations: {
										en: 'LangGraph Integration'
									}
								},
								{
									label: '工具展示',
									link: '/guides/web/tool-display',
									translations: {
										en: 'Tool Display'
									}
								},
							]
						},
						{
							label: '工具库',
							link: '/guides/utils',
							translations: {
								en: 'Utils'
							}
						},
					],
				},
				{
					label: '参考',
					translations: {
						en: 'Reference'
					},
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
