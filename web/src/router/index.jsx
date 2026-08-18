import React, { Suspense, lazy } from 'react';
import { BrowserRouter, useRoutes } from 'react-router-dom';

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
  const WidgetPreview = withSuspense(lazy(() => import('../pages/WidgetPreview')));

  const routes = [
    {
      path: '/embedded-demo',
      element: EmbeddedDemo,
    },
    {
      path: '/widget-preview',
      element: WidgetPreview,
    },
    {
      path: '*',
      element: Chat,
    },
  ];

  const Routes = () => {
    return useRoutes(routes);
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes />
    </BrowserRouter>
  );
};

export default AppRouter;
