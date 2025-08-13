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
					],
				},
				{
					label: 'API 参考',
					translations: {
						en: 'API Reference'
					},
					autogenerate: { directory: 'api' },
				},
				{
					label: '示例',
					translations: {
						en: 'Examples'
					},
					autogenerate: { directory: 'examples' },
				},
			],
		}),
	],
});
