import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, useRoutes, Outlet, redirect } from 'react-router-dom';
import DemoLayout from '@/pages/demos/layout';
import AgentDemo01 from '@/pages/demos/01agent';

const AppRouter = () => {
  const withSuspense = (LazyComponent) => {
    return (
      <Suspense>
        <LazyComponent />
      </Suspense>
    );
  };

  const Chat = withSuspense(lazy(() => import('../pages/chat')));
  const EmbeddedDemo = withSuspense(lazy(() => import('../pages/embedded-demo')));
  const PreviewDemo = withSuspense(lazy(() => import('../pages/preview-demo')));
  const Demos = withSuspense(lazy(() => import('../pages/demos')));
  const Fallback = withSuspense(lazy(() => import('../pages/fallback')));
  const Replay = withSuspense(lazy(() => import('../pages/replay')));
  const WidgetPreview = withSuspense(lazy(() => import('../pages/WidgetPreview')));
  const PagePreviewHeader = withSuspense(lazy(() => import('../pages/page-preview-header')));
  const TestVirtualScroll = withSuspense(lazy(() => import('../pages/test-virtual-scroll')));

  const routes = [
    {
      path: '/',
      element: Chat,
    },
    {
      path: '/chat',
      element: <Navigate to="/chat/01" />,
    },
    {
      path: '/chat/:agentId',
      element: Chat,
    },
    {
      path: '/chat/:agentId/:sessionId',
      element: Chat,
    },
    {
      path: '/chat/share/:shareId',
      element: Chat,
    },
    {
      path: '/demos',
      element: <DemoLayout />,
      children: [
        {
          path: '',
          element: <Navigate to="01agent" />,
        },
        {
          path: '01agent',
          element: <AgentDemo01 />,
        },
        {
          path: 'components',
          element: Demos,
        },
        {
          path: 'embedded',
          element: EmbeddedDemo,
        },
        {
          path: 'preview',
          element: PreviewDemo,
        },
        {
          path: 'widgets',
          element: WidgetPreview,
        },
        {
          path: 'virtual-scroll',
          element: TestVirtualScroll,
        },
      ],
    },
    {
      path: '/replay/:shareId',
      element: Replay,
    },
    {
      path: '/page-preview-header',
      element: PagePreviewHeader,
    },
    {
      path: '/page-preview-header/:agentId',
      element: PagePreviewHeader,
    },
    {
      path: '/page-preview-header/:agentId/:sessionId',
      element: PagePreviewHeader,
    },
    {
      path: '404',
      element: Fallback,
      errorElement: Fallback,
    },
    {
      path: '*',
      element: <Navigate to="/404" />,
    },
  ];

  const Routes = () => {
    return useRoutes(routes);
  };

  return (
    <BrowserRouter>
      <Routes />
    </BrowserRouter>
  );
};

export default AppRouter;
