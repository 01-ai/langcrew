export const templates = [
  {
    name: 'Event Session',
    jsx: `<Card size="md">
  <Col gap={1}>
    <Text value={type} size="sm" color="#FF7B00" />
    <Title value={title} size="sm" />
    <Text value={description} size="sm" color="secondary" />
  </Col>
  <Divider flush />
  <Col gap={3}>
    <Row gap={3}>
      <Box
        size={40}
        background="#FF7B00"
        radius="sm"
        align="center"
        justify="center"
      >
        <Icon name="map-pin" size="xl" />
      </Box>
      <Col>
        <Text
          value={location}
          size="sm"
          weight="semibold"
          color="emphasis"
          maxLines={1}
        />
        <Text value={time} size="sm" color="secondary" maxLines={1} />
      </Col>
      <Spacer />
      <Button label="View" variant="outline" />
    </Row>
    {speakers.map((item) => (
      <Row key={item.id} gap={3}>
        <Image src={item.image} />
        <Col>
          <Text
            value={item.name}
            size="sm"
            weight="semibold"
            color="emphasis"
            maxLines={1}
          />
          <Text value={item.title} size="sm" color="secondary" maxLines={1} />
        </Col>
        <Spacer />
        <Button label="View" variant="outline" />
      </Row>
    ))}
  </Col>
</Card>`,
    json: {
      id: 'session-orchestrating-agents-at-scale',
      title: 'Orchestrating Agents at Scale',
      description:
        'Click, connect, create. Learn how to quickly design and deploy enterprise-grade agents with a new suite of agentic platform tools.',
      type: 'Breakout session',
      track: 'Deploy and Scale',
      time: '11:15 AM',
      location: 'Cowell Theater',
      speakers: [
        {
          id: 'speaker-james-hills',
          name: 'James Hills',
          title: 'Member of Technical Staff',
          org: 'OpenAI',
          image: 'https://widgets.chatkit.studio/jameshills.png',
        },
        {
          id: 'speaker-rohan-mehta',
          name: 'Rohan Mehta',
          title: 'Member of Technical Staff',
          org: 'OpenAI',
          image: 'https://widgets.chatkit.studio/rohanmehta.png',
        },
      ],
    },
  },
  {
    name: 'rideStatus',
    jsx: `<Card size="sm">
  <Title value="1 min" size="xl" />

  <Row align="center">
    <Col minWidth="auto">
      <Caption value="Pick up" />
      <Text value="1008 Mission St" truncate />
    </Col>
    <Spacer />
    <Col align="end">
      <Caption value="Driver" />
      <Text value="Jonathan" />
    </Col>

    <Image
      src="https://cdn.openai.com/API/storybook/driver.png"
      size={40}
      radius="full"
    />
  </Row>
</Card>`,
    json: {
      eta: '1 min',
      address: '1008 Mission St',
      driver: {
        name: 'Jonathan',
        photo: 'https://cdn.openai.com/API/storybook/driver.png',
      },
    },
  },
  {
    name: 'flght tracker',
    jsx: `<Card
  size="md"
  theme="dark"
  background="linear-gradient(135deg, #378CD1 0%, #2B67AC 100%)"
>
  <Row>
    <Image src={airline.logo} size={16} />
    <Caption value={number} color="default" />
    <Spacer />
    <Caption value={date} color="alpha-50" />
  </Row>

  <Divider flush />

  <Col gap={3}>
    <Row align="center">
      <Text value={departure.city} />
      <Spacer />
      <Text value={arrival.city} />
    </Row>

    <Box height={8} radius="full" background="alpha-15">
      <Box width={progress} height="100%" radius="full" background="white" />
    </Box>

    <Row>
      <Row gap={2} align="center">
        <Text value={departure.time} size="sm" />
        <Text value={departure.status} color="alpha-50" size="sm" />
      </Row>
      <Spacer />
      <Row gap={2} align="center">
        <Text value={arrival.status} color="alpha-50" size="sm" />
        <Text value={arrival.time} size="sm" />
      </Row>
    </Row>
  </Col>
</Card>`,
    json: {
      number: 'PA 845',
      date: 'Fri, Apr 25',
      progress: '30%',
      airline: {
        name: 'Pan America',
        logo: 'https://widgets.chatkit.studio/panam.png',
      },
      departure: {
        city: 'San Francisco',
        status: 'On time',
        time: '4:00 PM',
      },
      arrival: {
        city: 'London',
        status: 'On time',
        time: '10:25 AM +1',
      },
    },
  },
  {
    name: 'weatherCurrent',
    jsx: `<Card theme="dark" size="sm" padding={{ y: 8, x: 4 }} background={background}>
  <Col align="center" gap={2}>
    <Row align="center" gap={2}>
      <Image src={conditionImage} size={80} />
      <Title value={temperature} size="3xl" weight="normal" color="white" />
    </Row>

    <Col align="center" gap={4}>
      <Caption value={location} color="white" size="lg" />
      <Text value={conditionDescription} color="white" textAlign="center" />
    </Col>
  </Col>
</Card>`,
    json: {
      location: 'San Francisco',
      background: 'linear-gradient(111deg, #1769C8 0%, #258AE3 56.92%, #31A3F8 100%)',
      conditionImage: 'https://cdn.openai.com/API/storybook/mostly-sunny.png',
      conditionDescription: 'Sunny sky and warm temperatures are expected for the rest of the afternoon.',
      temperature: '72°',
    },
  },
  {
    name: 'Create Event',
    jsx: `<Card
  size="md"
  confirm={{ label: "Add to calendar", action: { type: "calendar.add" } }}
  cancel={{ label: "Discard", action: { type: "calendar.discard" } }}
>
  <Row align="start">
    <Col align="start" gap={1} width={80}>
      <Caption value={date.name} size="lg" color="secondary" />
      <Title value={date.number} size="3xl" />
    </Col>

    <Col flex="auto">
      {events.map((item) => (
        <Row
          key={item.id}
          padding={{ x: 3, y: 2 }}
          gap={3}
          radius="xl"
          background={item.isNew ? "none" : "surface-secondary"}
          border={
            item.isNew
              ? { size: 1, color: item.color, style: "dashed" }
              : undefined
          }
        >
          <Box width={4} height="40px" radius="full" background={item.color} />
          <Col>
            <Text value={item.title} />
            <Text value={item.time} size="sm" color="tertiary" />
          </Col>
        </Row>
      ))}
    </Col>
  </Row>
</Card>`,
    json: {
      date: {
        name: 'Friday',
        number: '28',
      },
      events: [
        {
          id: 'lunch',
          title: 'Lunch',
          time: '12:00 - 12:45 PM',
          color: 'red-400',
          isNew: false,
        },
        {
          id: 'q1-roadmap-review',
          title: 'Q1 roadmap review',
          time: '1:00 - 2:00 PM',
          color: 'blue-400',
          isNew: true,
        },
        {
          id: 'team-standup',
          title: 'Team standup',
          time: '3:30 - 4:00 PM',
          color: 'red-400',
          isNew: false,
        },
      ],
    },
  },
  {
    name: 'Playlist',
    jsx: `<Card size="sm">
  <Image src={bannerImage} alt="K-POP" height={180} fit="cover" flush />
  <Col padding={{ y: 2 }}>
    {tracks.map((item, index) => (
      <Row key={item.id} align="center" gap={3}>
        <Caption value={\`$\{index + 1}\`} />
        <Image src={item.cover} />
        <Col flex="auto" gap={0}>
          <Text value={item.title} weight="semibold" />
          <Text value={item.artist} size="sm" color="secondary" />
        </Col>

        <Button
          iconStart="play"
          variant="ghost"
          uniform
          size="xl"
          onClickAction={{ type: "music.play", payload: { id: item.id } }}
        />
      </Row>
    ))}
  </Col>
  <Button
    label="View playlist"
    variant="outline"
    pill
    block
    onClickAction={{ type: "view.playlist", payload: { name: "kpop" } }}
  />
</Card>`,
    json: {
      bannerImage: 'https://widgets.chatkit.studio//kpop.png',
      tracks: [
        {
          id: 'retrovinyl',
          title: 'retrovinyl',
          artist: 'Erik Mclean',
          cover: 'https://widgets.chatkit.studio//album01.png',
        },
        {
          id: 'neon-polaroid',
          title: 'Neon Polaroid',
          artist: 'Efe Kurnaz',
          cover: 'https://widgets.chatkit.studio//album03.png',
        },
        {
          id: 'morning-grain',
          title: 'Morning Grain',
          artist: 'Reinhart Julian',
          cover: 'https://widgets.chatkit.studio//album02.png',
        },
      ],
    },
  },
  {
    name: 'draftEmail',
    jsx: `<Card
  size="lg"
  confirm={{
    action: { type: "email.send" },
    label: "Send email",
  }}
  cancel={{
    action: { type: "email.discard" },
    label: "Discard",
  }}
>
  <Row>
    <Text
      value="FROM"
      width={80}
      weight="semibold"
      color="tertiary"
      size="xs"
    />
    <Text value={emailFrom} color="tertiary" />
  </Row>

  <Divider flush />

  <Row>
    <Text value="TO" width={80} weight="semibold" color="tertiary" size="xs" />
    <Text
      value={defaultTo}
      editable={{
        name: "email.to",
        required: true,
        placeholder: "name@example.com",
      }}
    />
  </Row>

  <Divider flush />

  <Row>
    <Text
      value="SUBJECT"
      width={80}
      weight="semibold"
      color="tertiary"
      size="xs"
    />
    <Text
      value={defaultSubject}
      editable={{
        name: "email.subject",
        required: true,
        placeholder: "Email subject",
      }}
    />
  </Row>
  <Divider flush />
  <Text
    value={defaultBody}
    minLines={9}
    editable={{
      name: "email.body",
      required: true,
      placeholder: "Write your message…",
    }}
  />
</Card>`,
    json: {
      emailFrom: 'zj@openai.com',
      defaultTo: 'weedon@openai.com',
      defaultSubject: 'ChatKit Roadmap',
      defaultBody:
        "Hey David, \n\nHope you're doing well! Just wanted to check in and see if there are any updates on the ChatKit roadmap. We're excited to see what's coming next and how we can make the most of the upcoming features.\n\nEspecially curious to see how you support widgets!\n\nBest, Zach",
    },
  },
  {
    name: 'purchaseItems',
    jsx: `<Card size="sm">
  <Col>
    {items.map((item) => (
      <Row key={item.title} align="center">
        <Image src={item.image} size={48} />
        <Col>
          <Text
            value={item.title}
            size="md"
            weight="semibold"
            color="emphasis"
          />
          <Text value={item.subtitle} size="sm" color="secondary" />
        </Col>
      </Row>
    ))}
  </Col>

  <Divider flush />

  <Col>
    <Row>
      <Text value="Subtotal" size="sm" />
      <Spacer />
      <Text value={subTotal} size="sm" />
    </Row>
    <Row>
      <Text value={\`Sales tax ($\{taxPct})\`} size="sm" />
      <Spacer />
      <Text value={tax} size="sm" />
    </Row>
    <Row>
      <Text value="Total with tax" weight="semibold" size="sm" />
      <Spacer />
      <Text value={total} weight="semibold" size="sm" />
    </Row>
  </Col>

  <Divider flush />

  <Col>
    <Button
      label="Purchase"
      onClickAction={{ type: "purchase" }}
      style="primary"
      block
    />
    <Button
      label="Add to cart"
      onClickAction={{ type: "add_to_cart" }}
      style="secondary"
      block
    />
  </Col>
</Card>`,
    json: {
      items: [
        {
          image: 'https://cdn.openai.com/API/storybook/blacksugar.png',
          title: 'Black Sugar Hoick Latte',
          subtitle: '16oz Iced · Boba · $6.50',
        },
        {
          image: 'https://cdn.openai.com/API/storybook/classic.png',
          title: 'Classic Milk Tea',
          subtitle: '16oz Iced · Double Boba · $6.75',
        },
        {
          image: 'https://cdn.openai.com/API/storybook/matcha.png',
          title: 'Matcha Latte',
          subtitle: '16oz Iced · Boba · $6.50',
        },
      ],
      subTotal: '$19.75',
      taxPct: '8.75%',
      tax: '$1.72',
      total: '$21.47',
    },
  },
  {
    name: 'Channel message',
    jsx: `<Card size="md">
  <Row>
    <Text value={channel} />
    <Spacer />
    <Text value={time} color="tertiary" />
  </Row>
  <Divider flush />
  <Row align="start" gap={4}>
    <Image src={user.image} size={44} />
    <Col>
      <Text value={user.name} weight="semibold" />
      <Markdown
        value={\`End of week update for ChatKit:

1. Designed **new header system** with more flexibility for custom menu actions.
2. Made progress on **DevDay training material**.
3. Coordinated with partners to **prioritize remaining feature requirements**.

**Next week** I plan to focus on building out our Figma library and updating to new icons.\`}
      />
    </Col>
  </Row>
  <Spacer />
</Card>`,
    json: {
      channel: '#proj-chatkit',
      time: '4:48 PM',
      user: {
        image: 'https://widgets.chatkit.studio/zj.png',
        name: 'Zach Johnston',
      },
    },
  },
  {
    name: 'Purchase Complete',
    jsx: `<Card size="sm">
  <Col gap={3}>
    <Row align="center" gap={2}>
      <Icon name="check-circle-filled" color="success" />
      <Text size="sm" value="Purchase complete" color="success" />
    </Row>
    <Divider color="subtle" flush />

    <Row gap={3}>
      <Image src={product.image} alt="Blue folding chair" size={80} frame />
      <Col gap={1}>
        <Title value={product.name} maxLines={2} />
        <Text
          value="Free delivery • 14-day returns"
          size="sm"
          color="secondary"
        />
      </Col>
    </Row>
  </Col>
  <Col gap={2} padding={{ y: 2 }}>
    <Row>
      <Text value="Estimated delivery" size="sm" color="secondary" />
      <Spacer />
      <Text value="Thursday, Oct 8" size="sm" />
    </Row>
    <Row>
      <Text value="Sold by" size="sm" color="secondary" />
      <Spacer />
      <Text value="OpenAI" size="sm" />
    </Row>
    <Row>
      <Text value="Paid" size="sm" color="secondary" />
      <Spacer />
      <Text value="$20.00" size="sm" />
    </Row>
  </Col>

  <Button
    label="View details"
    onClickAction={{ type: "order.view_details" }}
    variant="outline"
    pill
    block
  />
</Card>`,
    json: {
      product: {
        name: 'Blue folding chair',
        image: 'https://widgets.chatkit.studio/blue-chair.png',
      },
    },
  },
  {
    name: 'Player Card',
    jsx: `<Card
  size="md"
  theme="dark"
  padding={8}
  background="url(https://ik.imagekit.io/m998roxrr/footballfroge.png) no-repeat center / cover"
>
  <Row align="center">
    <Box width="40%" minHeight={160} />
    <Col flex="auto">
      <Title
        value={\`$\{name} (#$\{number})\`}
        size="xl"
        color="white"
        weight="normal"
      />
      <Row>
        {stats.map((item, index) => (
          <Col flex={1} gap={0}>
            <Text value={item.value} weight="semibold" />
            <Caption value={item.label} color={accent} />
          </Col>
        ))}
      </Row>
    </Col>
  </Row>
</Card>`,
    json: {
      name: 'Froge',
      number: '22',
      accent: 'blue-100',
      stats: [
        {
          value: '18',
          label: 'PTS',
        },
        {
          value: '141',
          label: 'YDS',
        },
        {
          value: '2',
          label: 'TKL',
        },
        {
          value: '17',
          label: 'LEAPS',
        },
      ],
    },
  },
  {
    name: 'View Event',
    jsx: `<Card>
<Row align="stretch" gap={3}>
  <Box width={5} background={color} radius="full" />
  <Col flex={1} gap={1}>
    <Row>
      <Text
        color="alpha-70"
        size="sm"
        value={\`$\{date.dayName}, $\{date.monthName} $\{date.dayNumber}\`}
      />
      <Spacer />
      <Text color={color} size="sm" value={time} />
    </Row>
    <Title value={title} size="md" />
  </Col>
</Row>
</Card>`,
    json: {
      title: 'Q1 roadmap review',
      time: '1:00 - 2:00 PM',
      color: 'blue-400',
      date: {
        dayName: 'Friday',
        dayNumber: '28',
        monthName: 'Dec',
      },
    },
  },
  {
    name: 'Enable Notification',
    jsx: `<Card>
  <Col align="center" gap={4} padding={4}>
    <Box background="green-400" radius="full" padding={3}>
      <Icon name="check" size="3xl" color="white" />
    </Box>
    <Col align="center" gap={1}>
      <Title value={title} />
      <Text value={description} color="secondary" />
    </Col>
  </Col>

  <Row>
    <Button
      label="Yes"
      block
      onClickAction={{
        type: "notification.settings",
        payload: { enable: true },
      }}
    />
    <Button
      label="No"
      block
      variant="outline"
      onClickAction={{
        type: "notification.settings",
        payload: { enable: true },
      }}
    />
  </Row>
</Card>`,
    json: {
      title: 'Enable notification',
      description: 'Notify me when this item ships',
    },
  },
  {
    name: 'Create Task',
    jsx: `<Card size="md">
  <Form onSubmitAction={{ type: "task.create" }}>
    <Col gap={3}>
      <Text
        value={title}
        size="lg"
        weight="semibold"
        editable={{
          name: "task.title",
          required: true,
          placeholder: "Task title",
          autoFocus: false,
          autoSelect: false,
        }}
      />

      <Text
        value="Create a design proposal for how ChatKit's popup mode can support dynamic height and user resizing."
        minLines={5}
        editable={{
          name: "task.body",
          required: true,
          placeholder: "Describe the task…",
        }}
      />

      <Divider flush />

      <Row align="center" gap={3}>
        <Row align="center" gap={2}>
          <DatePicker
            name="task.due"
            placeholder="Due date"
            defaultValue="2025-10-16"
            clearable
            pill
          />
        </Row>
        <Spacer />
        <Button submit label="Create task" style="primary" />
      </Row>
    </Col>
  </Form>
</Card>`,
    json: {
      title: 'Design resizable popup mode',
    },
  },
  {
    name: 'weatherForecast',
    jsx: `<Card theme="dark" size="sm" padding={8} background={background}>
  <Col align="center" gap={3}>
    <Image src={conditionImage} size={60} />

    <Row align="center" gap={2}>
      <Title
        value={lowTemperature}
        size="2xl"
        weight="normal"
        color="alpha-70"
      />
      <Title
        value={highTemperature}
        size="2xl"
        color="emphasis"
        weight="normal"
      />
    </Row>

    <Caption value={location} color="emphasis" />
    <Text value={conditionDescription} textAlign="center" />

    <Row gap={6}>
      {forecast.map((day) => (
        <Col align="center" gap={0}>
          <Image src={day.conditionImage} size={40} />
          <Text value={day.temperature} />
        </Col>
      ))}
    </Row>
  </Col>
</Card>`,
    json: {
      background: 'linear-gradient(111deg, #1769C8 0%, #258AE3 56.92%, #31A3F8 100%)',
      conditionImage: 'https://cdn.openai.com/API/storybook/mixed-sun.png',
      lowTemperature: '47°',
      highTemperature: '69°',
      location: 'San Francisco, CA',
      conditionDescription: 'Partly sunny skies accompanied by some clouds',
      forecast: [
        {
          conditionImage: 'https://cdn.openai.com/API/storybook/mostly-sunny.png',
          temperature: '54°',
        },
        {
          conditionImage: 'https://cdn.openai.com/API/storybook/rain.png',
          temperature: '54°',
        },
        {
          conditionImage: 'https://cdn.openai.com/API/storybook/mixed-sun.png',
          temperature: '54°',
        },
        {
          conditionImage: 'https://cdn.openai.com/API/storybook/windy.png',
          temperature: '54°',
        },
        {
          conditionImage: 'https://cdn.openai.com/API/storybook/mostly-sunny.png',
          temperature: '54°',
        },
      ],
    },
  },
  {
    name: 'Software Purchase',
    jsx: `<Card
  size="sm"
  padding={0}
  confirm={{ label: "Confirm", action: { type: "request.submit" } }}
  cancel={{ label: "Discard", action: { type: "request.discard" } }}
>
  <Row align="center" padding={{ x: 4, top: 4, bottom: 1 }}>
    <Title value="Software purchase" size="sm" />
  </Row>
  <Col padding={{ left: 4, right: 2 }}>
    <Row padding={{ right: 2 }}>
      <Text value="What is it for?" size="sm" color="secondary" />
      <Spacer />
      <Box padding={1.1}>
        <Text
          value={productName}
          textAlign="end"
          width="200px"
          editable={{
            name: "purchase.purpose",
            required: true,
            placeholder: "Vendor or tool",
          }}
        />
      </Box>
    </Row>
    <Row>
      <Text value="Start date" size="sm" color="secondary" />
      <Spacer />
      <DatePicker
        name="purchase.start"
        defaultValue={startDate}
        align="end"
        variant="ghost"
      />
    </Row>
    <Row>
      <Text value="End date" size="sm" color="secondary" />
      <Spacer />
      <DatePicker
        name="purchase.end"
        defaultValue={endDate}
        align="end"
        variant="ghost"
      />
    </Row>
    <Row>
      <Text value="Volume" size="sm" color="secondary" />
      <Spacer />
      <Select
        name="purchase.volume"
        options={volumeOptions}
        defaultValue={defaultVolume}
        variant="ghost"
      />
    </Row>
    <Row>
      <Text value="Frequency" size="sm" color="secondary" />
      <Spacer />
      <Select
        name="purchase.frequency"
        options={frequencyOptions}
        defaultValue={defaultFrequency}
        variant="ghost"
      />
    </Row>
  </Col>
  <Row
    padding={{ y: 4, left: 4, right: 5 }}
    background="surface-elevated-secondary"
    border={{ top: { size: 1 } }}
  >
    <Text value="Total amount" size="sm" />
    <Spacer />
    <Box></Box>
    <Text value={totalAmount} weight="semibold" size="sm" />
  </Row>
</Card>`,
    json: {
      productName: 'ChatGPT Business',
      startDate: '2025-10-01',
      endDate: '2026-10-01',
      volumeOptions: [
        {
          label: '1 seat',
          value: '1',
        },
        {
          label: '3 seats',
          value: '3',
        },
        {
          label: '5 seats',
          value: '5',
        },
        {
          label: '10 seats',
          value: '10',
        },
        {
          label: '25 seats',
          value: '25',
        },
      ],
      defaultVolume: '5',
      frequencyOptions: [
        {
          label: 'Monthly',
          value: 'monthly',
        },
        {
          label: 'Quarterly',
          value: 'quarterly',
        },
        {
          label: 'Yearly',
          value: 'yearly',
        },
      ],
      defaultFrequency: 'monthly',
      totalAmount: '$125 / month',
    },
  },
  {
    name: 'Trending topics',
    jsx: `<ListView status={{ text: statusText, icon: "chart"}} limit={2}>
  {items.map((item) => (
    <ListViewItem
      key={item.id}
      gap={3}
      onClickAction={{ type: "topic.open", payload: { id: item.id } }}
      
    >
      <Box background="alpha-10" radius="sm" padding={2}>
        <Icon name="star-filled" size="lg" />
      </Box>
      <Col gap={0}>
        <Text value={item.title} size="sm" weight="semibold" />
        <Caption value={\`\${item.tag} • \${item.time}\`} color="secondary" />
      </Col>
      <Spacer />
      <Badge
        label={
          item.trend === "up" ? "Rising" : item.trend === "down" ? "Falling" : "Steady"
        }
        color={
          item.trend === "up"
            ? "success"
            : item.trend === "down"
              ? "danger"
              : "secondary"
        }
      />
    </ListViewItem>
  ))}
</ListView>`,
    json: {
      statusText: 'Trending today',
      items: [
        {
          id: 't1',
          title: 'AI privacy regulation debate intensifies',
          tag: 'Technology',
          time: '2025-11-13 10:20',
          trend: 'up',
        },
        {
          id: 't2',
          title: 'Global markets remain volatile',
          tag: 'Finance',
          time: '2025-11-13 09:55',
          trend: 'steady',
        },
        {
          id: 't3',
          title: 'Major sporting event approaches',
          tag: 'Sports',
          time: '2025-11-13 08:30',
          trend: 'up',
        },
        {
          id: 't4',
          title: 'Film festival award winners spark discussion',
          tag: 'Culture',
          time: '2025-11-13 07:45',
          trend: 'down',
        },
        {
          id: 't5',
          title: 'Extreme weather events draw attention',
          tag: 'Social',
          time: '2025-11-13 06:10',
          trend: 'up',
        },
        {
          id: 't6',
          title: '666',
          tag: 'Social',
          time: '2025-11-13 06:10',
          trend: 'up',
        },
      ],
    },
  },
  {
    name: 'Kai-Fu Lee',
    jsx: `<Card size="sm">
  <Col gap={1}>
    <Title value={name} size="md" />
    <Text value={subtitle} size="sm" color="secondary" />
  </Col>
  <Divider />
  <Col gap={2}>
    {facts.map((item) => (
      <Row key={item.key} gap={2} align="center">
        <Icon name={item.icon} color="secondary" />
        <Text value={\`\${item.label}:\${item.value}\`} size="sm" />
      </Row>
    ))}
  </Col>
  <Divider />
  <Row gap={2} align="center">
    {badges.map((b, idx) => (
      <Badge key={\`\${b}-\${idx}\`} label={b} />
    ))}
  </Row>
</Card>`,
    json: {
      name: 'Kai-Fu Lee',
      subtitle: 'Chairman and CEO of Sinovation Ventures | Founder of 01.AI',
      badges: ['Speech recognition', 'Human-computer interaction', 'AI 2.0'],
      facts: [
        {
          key: 'dob',
          icon: 'calendar',
          label: 'Birth',
          value: '1961-12-03',
        },
        {
          key: 'origin',
          icon: 'map-pin',
          label: 'Origin/Place of birth',
          value: 'Chengdu, Sichuan; born in New Taipei, Taiwan',
        },
        {
          key: 'education',
          icon: 'lab',
          label: 'Education',
          value: 'B.S., Columbia University; Ph.D., Carnegie Mellon University',
        },
        {
          key: 'career',
          icon: 'suitcase',
          label: 'Experience',
          value: 'Former Microsoft and Google executive; founding president of Microsoft Research Asia; entrepreneur',
        },
        {
          key: 'location',
          icon: 'map-pin',
          label: 'Current place of residence',
          value: 'Beijing',
        },
      ],
    },
  },
  {
    name: 'Daily quote',
    jsx: `<Card size="sm">
  <Col gap={3}>
    <Row gap={2}>
      <Box background="alpha-10" radius="full" padding={2}>
        <Icon name="book-open" />
      </Box>
      <Title value="Daily quote" size="sm" />
      <Spacer />
      <Badge label="Today" size="sm" />
    </Row>
    <Text value={\`“\${quote}”\`} />
    {author && (
      <Text value={\`— \${author}\`} size="sm" color="secondary" italic />
    )}
    <Row>
      <Spacer />
      <Button
        label="Another quote"
        size="sm"
        variant="outline"
        onClickAction={{ type: "quote.next" }}
      />
    </Row>
  </Col>
</Card>`,
    json: {
      quote: 'Without accumulating small steps, one cannot reach a thousand miles.',
      author: 'Xunzi',
    },
  },
  {
    name: 'Place Info',
    jsx: `<Card size="sm">
  <Col gap={2}>
    <Row gap={2} align="center">
      <Box background="alpha-10" radius="sm" padding={2}>
        <Icon name={icon} size="lg" />
      </Box>
      <Title value={title} size="md" />
      <Spacer />
      <Badge label={kindLabel} variant="soft" />
    </Row>
    <Text value={summary} size="sm" color="secondary" />
  </Col>
</Card>`,
    json: {
      title: 'Tokyo',
      kindLabel: 'City',
      icon: 'map-pin',
      summary: 'Population 13.9M · GDP $2.1T',
    },
  },
  {
    name: 'Trivia',
    jsx: `<Card size="sm">
  <Col gap={3}>
    <Row gap={2} align="center">
      <Icon name="sparkle" />
      <Title value="Trivia · Random Fact" size="sm" />
    </Row>
    <Text value={fact} />
    <Row>
      <Spacer />
      <Button
        label="Another fact"
        iconStart="reload"
        onClickAction={{ type: "trivia.refresh" }}
      />
    </Row>
  </Col>
</Card>`,
    json: {
      fact: 'Octopuses have three hearts.',
    },
  },
  {
    name: 'Temperature trend chart',
    jsx: `<Card size="sm">
  <Col gap={2}>
    <Row>
      <Title value={title} size="sm" />
      <Spacer />
      <Badge label={changeLabel} color={changeColor} />
    </Row>
    <Text value={subtitle} size="sm" color="secondary" />
    <Chart
      height={160}
      data={chartData}
      series={chartSeries}
      xAxis={chartXAxis}
      showYAxis={chartShowYAxis}
      showLegend={chartShowLegend}
    />
    <Row>
      <Caption value={dateRange} color="secondary" />
    </Row>
  </Col>
</Card>`,
    json: {
      title: 'Data Snapshot',
      subtitle: 'Last 7 days · Temperature (°C)',
      changeLabel: '↑ 1.4°C',
      changeColor: 'success',
      dateRange: '2025-11-07 to 11-13',
      chartData: [
        {
          date: '11-07',
          temp: 14.2,
        },
        {
          date: '11-08',
          temp: 13.7,
        },
        {
          date: '11-09',
          temp: 15.1,
        },
        {
          date: '11-10',
          temp: 14.8,
        },
        {
          date: '11-11',
          temp: 15.4,
        },
        {
          date: '11-12',
          temp: 15,
        },
        {
          date: '11-13',
          temp: 15.6,
        },
      ],
      chartSeries: [
        {
          type: 'line',
          label: 'Temperature (°C)',
          dataKey: 'temp',
          color: 'blue',
          curveType: 'monotoneX',
        },
      ],
      chartXAxis: {
        dataKey: 'date',
      },
      chartShowYAxis: true,
      chartShowLegend: false,
    },
  },
  {
    name: 'User Information Collection Form',
    jsx: `<Card size="sm">
  <Col gap={1}>
    <Title value={title} size="md" />
    <Text value={note} size="sm" color="secondary" />
  </Col>
  <Divider />
  <Form onSubmitAction={{ type: "user.info.submit" }}>
    <Col gap={3}>
      <Col gap={1}>
        <Label value="Name" fieldName="user.name" />
        <Input
          name="user.name"
          placeholder="Your name."
          required
          defaultValue={initialName}
        />
      </Col>
      <Col gap={1}>
        <Label value="Email" fieldName="user.email" />
        <Input
          name="user.email"
          inputType="email"
          placeholder="name@example.com"
          required
          defaultValue={initialEmail}
        />
      </Col>
      <Col gap={1}>
        <Label value="Telephone (optional)" fieldName="user.phone" />
        <Input
          name="user.phone"
          inputType="tel"
          placeholder="Mobile or landline number"
          defaultValue={initialPhone}
        />
      </Col>
      <Col gap={1}>
        <Label value="Birthday" fieldName="user.birthday" />
        <DatePicker name="user.birthday" placeholder="Select a date" />
      </Col>
      <Col gap={1}>
        <Label value="Country/Area (optional)" fieldName="user.country" />
        <Select
          name="user.country"
          options={countryOptions}
          defaultValue={defaultCountry}
          clearable
        />
      </Col>
      <Col gap={1}>
        <Label value="Gender" fieldName="user.sex" />
        <RadioGroup
          name="user.sex"
          options={[
            { label: "Male", value: "m" },
            { label: "Female", value: "f" },
          ]}
        />
      </Col>
      <Col gap={1}>
        <Label value="Notes" fieldName="user.des" />
        <Textarea name="message" rows={4} />
      </Col>

      <Row>
        <Checkbox name="user.consent" label="I'm in favor of being contacted." required />
        <Spacer />
        <Button submit label="Submit" style="primary" />
      </Row>
    </Col>
  </Form>
</Card>`,
    json: {
      title: 'User Information',
      note: 'Minimum fields: name, mailbox; optional: telephone, country; consent to be selected.',
      initialName: '',
      initialEmail: '',
      initialPhone: '',
      countryOptions: [
        {
          label: 'China',
          value: 'CN',
        },
        {
          label: 'United States',
          value: 'US',
        },
        {
          label: 'India',
          value: 'IN',
        },
        {
          label: 'United Kingdom',
          value: 'GB',
        },
        {
          label: 'Other',
          value: 'OTHER',
        },
      ],
      defaultCountry: '',
    },
  },
  {
    name: 'component:buttons',
    jsx: `<Card>
  <Button label="Button disabled" />
  <Button
    label="Button color: primary"
    color="primary"
    variant="solid"
    pill={true}
    onClickAction={{
      type: "show_toast",
      handler: 'client',
      payload: {
        message: 'hello'
      }
    }}
  />
  <Button
    label="Button color: info"
    color="info"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button color: secondary"
    color="secondary"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button color: discovery"
    color="discovery"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button color: success"
    color="success"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button color: caution"
    color="caution"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button color: warning"
    color="warning"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button color: danger"
    color="danger"
    onClickAction={{ type: "" }}
  />

  <Divider />
  <Button
    label="Button with icons"
    iconStart="agent"
    iconEnd="check"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button icons size: sm"
    iconSize="sm"
    iconStart="agent"
    iconEnd="check"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button icons size: md"
    iconSize="md"
    iconStart="agent"
    iconEnd="check"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button icons size: lg"
    iconSize="lg"
    iconStart="agent"
    iconEnd="check"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button icons size: xl"
    iconSize="xl"
    iconStart="agent"
    iconEnd="check"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button icons size: 2xl"
    iconSize="2xl"
    iconStart="agent"
    iconEnd="check"
    onClickAction={{ type: "" }}
  />
  <Divider />
  <Button
    label="Button variant: solid"
    variant="solid"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button variant: soft"
    variant="soft"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button variant: outline"
    variant="outline"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button variant: ghost"
    variant="ghost"
    onClickAction={{ type: "" }}
  />

  <Button
    label="Button style: primary"
    style="primary"
    onClickAction={{ type: "" }}
  />
  <Button
    label="Button style: secondary"
    style="secondary"
    onClickAction={{ type: "" }}
  />

  <Button label="Button pill: true" pill={true} onClickAction={{ type: "" }} />
  <Button
    label="Button pill: false"
    pill={false}
    onClickAction={{ type: "" }}
  />
</Card>`,
    json: {},
  },
  {
    name: 'component:input',
    jsx: `<Card>
  <Input name="email" placeholder="default" />
  <Input name="email" placeholder="inputType: number" inputType="number" />
  <Input name="email" placeholder="inputType: email" inputType="email" />
  <Input name="email" placeholder="inputType: text" inputType="text" />
  <Input name="email" placeholder="inputType: password" inputType="password" />
  <Input name="email" placeholder="inputType: tel" inputType="tel" />
  <Input name="email" placeholder="inputType: url" inputType="url" />
  <Input name="email" placeholder="variant: soft" variant="soft" />
  <Input name="email" placeholder="variant: outline" variant="outline" />
  <Input name="email" placeholder="size: sm" size="sm" />
  <Input name="email" placeholder="size: md" size="md" />
  <Input name="email" placeholder="size: lg" size="lg" />
  <Input name="email" placeholder="size: xl" size="xl" />
  <Input name="email" placeholder="size: 2xl" size="2xl" />
  <Input name="email" placeholder="size: 3xs" size="3xs" />
  <Input name="email" placeholder="size: 2xs" size="2xs" />
  <Input name="email" placeholder="size: xs" size="xs" />
  <Input name="email" placeholder="size: 3xl" size="3xl" />
  <Input name="email" placeholder="gutterSize: sm" gutterSize="sm" />
  <Input name="email" placeholder="gutterSize: md" gutterSize="md" />
  <Input name="email" placeholder="gutterSize: lg" gutterSize="lg" />
  <Input name="email" placeholder="gutterSize: xl" gutterSize="xl" />
  <Input name="email" placeholder="gutterSize: 2xs" gutterSize="2xs" />
  <Input name="email" placeholder="gutterSize: xs" gutterSize="xs" />
  <Input name="email" placeholder="disabled" disabled />
  <Input name="email" placeholder="pill" pill />
</Card>`,
    json: {},
  },
  {
    name: 'component:date-picker',
    jsx: `<Card>
  <DatePicker name="birthday" placeholder="default" />
  <DatePicker name="birthday" placeholder="variant: solid" variant="solid" />
  <DatePicker name="birthday" placeholder="variant: soft" variant="soft" />
  <DatePicker
    name="birthday"
    placeholder="variant: outline"
    variant="outline"
  />
  <DatePicker name="birthday" placeholder="variant: ghost" variant="ghost" />

  <DatePicker name="birthday" defaultValue="2024-01-31" />
  <DatePicker name="birthday" placeholder="size: sm" size="sm" />
  <DatePicker name="birthday" placeholder="size: md" size="md" />
  <DatePicker name="birthday" placeholder="size: lg" size="lg" />
  <DatePicker name="birthday" placeholder="size: xl" size="xl" />
  <DatePicker name="birthday" placeholder="size: 2xl" size="2xl" />
  <DatePicker name="birthday" placeholder="size: 3xs" size="3xs" />
  <DatePicker name="birthday" placeholder="size: 2xs" size="2xs" />
  <DatePicker name="birthday" placeholder="size: xs" size="xs" />
  <DatePicker name="birthday" placeholder="size: 3xl" size="3xl" />
  <DatePicker name="birthday" placeholder="side: top" side="top" />
  <DatePicker name="birthday" placeholder="side: bottom" side="bottom" />
  <DatePicker name="birthday" placeholder="side: left" side="left" />
  <DatePicker name="birthday" placeholder="side: right" side="right" />
  <DatePicker name="birthday" placeholder="align: start" align="start" />
  <DatePicker name="birthday" placeholder="align: center" align="center" />
  <DatePicker name="birthday" placeholder="align: end" align="end" />
  <DatePicker name="birthday" placeholder="pill" pill />
  <DatePicker name="birthday" placeholder="clearable" clearable />
  <DatePicker name="birthday" placeholder="disabled" disabled />
</Card>`,
    json: {},
  },
  {
    name: 'component:select',
    jsx: `<Card>
  <Select name="choice" options={[{ label: "A", value: "a" }]} />
  <Select name="choice" options={[{ label: "A", value: "a" }]} defaultValue="a" />

  <Select name="choice" placeholder="variant: solid" variant="solid" />
  <Select name="choice" placeholder="variant: soft" variant="soft" />
  <Select name="choice" placeholder="variant: outline" variant="outline" />
  <Select name="choice" placeholder="variant: ghost" variant="ghost" />
  <Select name="choice" placeholder="size: sm" size="sm" />
  <Select name="choice" placeholder="size: md" size="md" />
  <Select name="choice" placeholder="size: lg" size="lg" />
  <Select name="choice" placeholder="size: xl" size="xl" />
  <Select name="choice" placeholder="size: 2xl" size="2xl" />
  <Select name="choice" placeholder="size: 3xs" size="3xs" />
  <Select name="choice" placeholder="size: 2xs" size="2xs" />
  <Select name="choice" placeholder="size: xs" size="xs" />
  <Select name="choice" placeholder="size: 3xl" size="3xl" />
  <Select placeholder="pill" pill />
  <Select placeholder="block" block />
  <Select placeholder="clearable" clearable />
  <Select placeholder="disabled" disabled />
</Card>`,
    json: {},
  },
  {
    name: 'Corporate information',
    jsx: `<Card>
  <Title value={\`\${name}\`} size="sm" />
  <Col>
    <Text value={description} />
    <Divider />
    <Row>
      <Icon name="calendar" />
      <Text value="Founded" color="secondary" />
      <Text value={foundDate} />
    </Row>
    <Row>
      <Icon name="batch" />
      <Text value={companyType} color="secondary" />
    </Row>
    <Row>
      <Icon name="map-pin" />
      <Text value={position} color="secondary" />
    </Row>
    <Row>
      <Icon name="user" />
      <Text value={size} color="secondary" />
    </Row>
    <Row>
      <Icon name="external-link" />
      <Text value={site} color="secondary" />
    </Row>
    <Row wrap="wrap" gap={2}>
      {tags.map((item) => (
        <Badge label={item} color="info" size="md" />
      ))}
    </Row>
  </Col>
</Card>`,
    json: {
      name: 'Church Base',
      rank: 167931,
      up: true,
      description: 'Church base offers a complete church engagement platform, with websites, apps giving and services.',
      foundDate: '2025-11-20',
      companyType: 'Private',
      position: 'Frisco, Texas, United States',
      size: '11-50',
      site: 'churchbase.com',
      tags: ['Apps', 'Information Services', 'Information Technology'],
    },
  },
  {
    name: 'Insurance',
    jsx: `<Card
  asForm
  size="md"
  confirm={{ label: "Submission of insurance", action: { type: "insurance.apply" } }}
  cancel={{ label: "Cancel", action: { type: "insurance.cancel" } }}
>
  <Col gap={3}>
    <Title value="Insurance forms" size="md" />

    <Caption value="Insurance scheme" />
    <Col gap={2}>
      <Col>
        <Label value="Products" fieldName="plan.product" />
        <Select
          name="plan.product"
          options={productOptions}
          placeholder="Select the product"
        />
      </Col>
      <Col>
        <Label value="Guarantee ($)" fieldName="plan.sumAssured" />
        <Input
          name="plan.sumAssured"
          inputType="number"
          placeholder="For example: 300000"
          required
        />
      </Col>
      <Col>
        <Label value="Years of contributions" fieldName="plan.premiumYears" />
        <Select
          name="plan.premiumYears"
          options={payYearOptions}
          placeholder="Select Years"
        />
      </Col>
    </Col>

    <Divider />

    <Caption value="Information on the insured person" />
    <Col gap={2}>
      <Col>
        <Label value="Name" fieldName="policyholder.name" />

        <Input name="policyholder.name" placeholder="Zhang San" required />
      </Col>
      <Col>
        <Label value="ID number" fieldName="policyholder.id" />

        <Input name="policyholder.id" placeholder="18ID number" required />
      </Col>
      <Col>
        <Label value="Cell phone number" fieldName="policyholder.phone" />

        <Input
          name="policyholder.phone"
          inputType="tel"
          placeholder="11Cell phone number"
          required
        />
      </Col>
    </Col>

    <Divider />

    <Caption value="Information on the insured person" />
    <Col gap={2}>
      <Col>
        <Label value="Name" fieldName="insured.name" />

        <Input name="insured.name" placeholder="Li Siu" required />
      </Col>
      <Col>
        <Label value="ID number" fieldName="insured.id" />

        <Input name="insured.id" placeholder="18ID number" required />
      </Col>
      <Col>
        <Label value="Cell phone number" fieldName="insured.phone" />

        <Input
          name="insured.phone"
          inputType="tel"
          placeholder="11Cell phone number"
          required
        />
      </Col>
      <Col>
        <Label value="Age" fieldName="insured.age" />

        <Input
          name="insured.age"
          inputType="number"
          placeholder="Age"
          required
        />
      </Col>
      <Col>
        <Label value="Gender" fieldName="insured.gender" />

        <Select
          name="insured.gender"
          options={genderOptions}
          placeholder="Sex selection"
        />
      </Col>
    </Col>

    <Divider />

    <Caption value="Beneficiaries" />
    <Col gap={2}>
      <Col>
        <Label value="Name" fieldName="benefit.death.name" />

        <Input name="benefit.death.name" placeholder="Name of beneficiary" required />
      </Col>
      <Col>
        <Label value="Relations with policy-holders" fieldName="benefit.death.relation" />

        <Input
          name="benefit.death.relation"
          placeholder="For example, a spouse/Children/Parents"
          required
        />
      </Col>
      <Col>
        <Label value="Cell phone number" fieldName="benefit.death.phone" />

        <Input
          name="benefit.death.phone"
          inputType="tel"
          placeholder="Cell phone number"
        />
      </Col>
      <Col>
        <Label value="Proportion of beneficiaries%" fieldName="benefit.death.share" />

        <Input
          name="benefit.death.share"
          inputType="number"
          placeholder="For example: 100"
          defaultValue="100"
        />
      </Col>
    </Col>

    <Divider />

    <Caption value="Disabled beneficiaries" />
    <Col gap={2}>
      <Col>
        <Label value="Name" fieldName="benefit.disability.name" />

        <Input name="benefit.disability.name" placeholder="Name of beneficiary" />
      </Col>
      <Col>
        <Label value="Relations with policy-holders" fieldName="benefit.disability.relation" />

        <Input
          name="benefit.disability.relation"
          placeholder="For example, a spouse/Children/Parents"
        />
      </Col>
      <Col>
        <Label value="Cell phone number" fieldName="benefit.disability.phone" />

        <Input
          name="benefit.disability.phone"
          inputType="tel"
          placeholder="Cell phone number"
        />
      </Col>
      <Col>
        <Label value="Proportion of beneficiaries%" fieldName="benefit.disability.share" />

        <Input
          name="benefit.disability.share"
          inputType="number"
          placeholder="For example: 100"
        />
      </Col>
    </Col>
  </Col>
</Card>`,
    json: {
      productOptions: [
        {
          label: 'Serious disease risk',
          value: 'critical',
        },
        {
          label: 'Periodic life insurance',
          value: 'term',
        },
        {
          label: 'Accident insurance',
          value: 'accident',
        },
      ],
      payYearOptions: [
        {
          label: 'One hand.',
          value: '1',
        },
        {
          label: '5Year',
          value: '5',
        },
        {
          label: '10Year',
          value: '10',
        },
        {
          label: '20Year',
          value: '20',
        },
      ],
      genderOptions: [
        {
          label: 'Men',
          value: 'male',
        },
        {
          label: 'Women',
          value: 'female',
        },
      ],
    },
  },
  {
    name: 'Corporate performance and general',
    jsx: `<Card size="md">
  <Col gap={4}>
    <Col gap={2}>
      <Title value="Corporate performance and general" size="md" />
      <Row gap={3}>
        <Col gap={1} border={{ size: 1 }} radius="lg" padding={3} flex={1}>
          <Caption value="Growth Score" />
          <Row>
            <Title value={\`\${scores.growthScore}\`} size="2xl" />
            <Spacer />
            <Badge
              label={\`\${scores.periodLabel} +\${scores.growthChange}\`}
              color="success"
              variant="soft"
            />
          </Row>
        </Col>
        <Col gap={1} border={{ size: 1 }} radius="lg" padding={3} flex={1}>
          <Caption value="Heat Score" />
          <Row>
            <Title value={\`\${scores.heatScore}\`} size="2xl" />
            <Spacer />
            <Badge
              label={\`\${scores.periodLabel} +\${scores.heatChange}\`}
              color="success"
              variant="soft"
            />
          </Row>
        </Col>
      </Row>
    </Col>

    <Divider />

    <Col gap={2}>
      <Row>
        <Text value="Corporate performance indicators (near)3months)" size="sm" color="secondary" />
      </Row>
      <Chart
        data={chartData}
        xAxis={{ dataKey: "date", labels: xAxisLabels }}
        series={[
          {
            type: "area",
            dataKey: "heatScore",
            label: "Heat Score",
            color: "pink",
          },
          {
            type: "line",
            dataKey: "heatTrend",
            label: "Heat Trend",
            color: "red",
          },
          {
            type: "line",
            dataKey: "growthScore",
            label: "Growth Score",
            color: "blue",
          },
          {
            type: "line",
            dataKey: "growthTrend",
            label: "Growth Trend",
            color: "green",
          },
        ]}
        showYAxis
        showLegend
        height={220}
      />
      <Row>
        <Caption value="Time" />
        <Spacer />
        <Caption value="Score" />
      </Row>
    </Col>

    <Divider />

    <Col gap={2}>
      <Row>
        <Text value="Company file activity" size="sm" color="secondary" />
        <Spacer />
        <Badge label={activity.status} color="success" variant="soft" />
      </Row>
      <Text value={activity.industry} size="sm" color="tertiary" />
      <Col gap={1}>
        <Box height={10} background="surface-secondary" radius="xl" padding={0}>
          <Box
            height="100%"
            width={\`\${activity.percent}%\`}
            background="green-500"
            radius="xl"
          />
        </Box>
        <Row>
          <Caption value="Low Activity" />
          <Spacer />
          <Caption value="High Activity" />
        </Row>
      </Col>
    </Col>

    <Divider />

    <Col gap={2}>
      <Title value="Company details" size="sm" />
      <Col gap={2}>
        <Row>
          <Text value="Legal Name" size="sm" color="secondary" />
          <Spacer />
          <Text value={details.legalName} size="sm" />
        </Row>
        <Row>
          <Text value="Operating Status" size="sm" color="secondary" />
          <Spacer />
          <Text value={details.operatingStatus} size="sm" />
        </Row>
        <Row>
          <Text value="Company Type" size="sm" color="secondary" />
          <Spacer />
          <Text value={details.companyType} size="sm" />
        </Row>
        <Row>
          <Text value="Founders" size="sm" color="secondary" />
          <Spacer />
          <Text value={details.founders} size="sm" />
        </Row>
        <Col>
          <Text value="About the Company" size="sm" color="secondary" />
          <Text value={details.about} size="sm" color="emphasis" />
        </Col>
        <Row>
          <Text value="Phone Number" size="sm" color="secondary" />
          <Spacer />
          <Text value={details.phone} size="sm" />
        </Row>
        <Row>
          <Text value="Contact Email" size="sm" color="secondary" />
          <Spacer />
          <Text value={details.email} size="sm" />
        </Row>
      </Col>
    </Col>
  </Col>
</Card>`,
    json: {
      scores: {
        periodLabel: 'QoQ',
        heatScore: 91,
        heatChange: 11,
        growthScore: 84,
        growthChange: 7,
      },
      chartData: [
        {
          date: '2025-09-01',
          heatScore: 80,
          heatTrend: 78,
          growthScore: 77,
          growthTrend: 75,
        },
        {
          date: '2025-10-01',
          heatScore: 86,
          heatTrend: 83,
          growthScore: 81,
          growthTrend: 79,
        },
        {
          date: '2025-11-01',
          heatScore: 91,
          heatTrend: 89,
          growthScore: 84,
          growthTrend: 82,
        },
      ],
      xAxisLabels: {
        '2025-09-01': 'Sep',
        '2025-10-01': 'Oct',
        '2025-11-01': 'Nov',
      },
      activity: {
        industry: 'Information Services Corporation',
        percent: 92,
        status: 'High Activity',
      },
      details: {
        legalName: 'Church Base',
        operatingStatus: 'Active',
        companyType: 'For Profit',
        founders: 'Jonathan Bodnar',
        about: 'Program-based development services, providing a full platform for church participation, including services such as websites, applications, donations, etc.',
        phone: '+1 800 577 0256',
        email: 'info@apolloapps.com',
      },
    },
  },
  {
    name: 'badges',
    jsx: `<Card>
  <Title value="color" />
  <Badge label="info" color="info" size="md" />
  <Badge label="secondary" color="secondary" size="md" />
  <Badge label="discovery" color="discovery" size="md" />
  <Badge label="success" color="success" size="md" />
  <Badge label="warning" color="warning" size="md" />
  <Badge label="danger" color="danger" size="md" />
  <Divider />
  <Title value="size" />
  <Badge label="sm" size="sm" />
  <Badge label="md" size="md" />
  <Badge label="lg" size="lg" />
  <Divider />
  <Title value="variant" />
  <Badge label="solid" variant="solid" />
  <Badge label="soft" variant="soft" />
  <Badge label="outline" variant="outline" />
</Card>`,
    json: {},
  },
];

export const defaultJson = {
  type: 'Card',
  size: 'md',
  asForm: true,
  confirm: {
    label: 'Ready.',
    action: {
      type: 'visit.prepare.confirm',
    },
  },
  cancel: {
    label: 'Clear',
    action: {
      type: 'visit.prepare.reset',
    },
  },
  children: [
    {
      type: 'Col',
      gap: 3,
      children: [
        {
          type: 'Row',
          gap: 3,
          align: 'start',
          children: [
            {
              type: 'Box',
              size: 40,
              background: 'green-400',
              radius: 'sm',
              align: 'center',
              justify: 'center',
              children: [
                {
                  type: 'Icon',
                  name: 'lifesaver',
                  color: 'white',
                  size: 'xl',
                },
              ],
            },
            {
              type: 'Col',
              gap: 1,
              flex: 'auto',
              children: [
                {
                  type: 'Title',
                  value: 'Example: City People \' s Hospital',
                  size: 'md',
                },
                {
                  type: 'Text',
                  value: 'Example: City Health Road123No. The clinic.',
                  size: 'sm',
                  color: 'secondary',
                },
                {
                  type: 'Text',
                  value: 'Outpatient hours: Monday-Sunday 08:00-17:00（Emergency24hours)',
                  size: 'sm',
                  color: 'secondary',
                },
              ],
            },
          ],
        },
        {
          type: 'Col',
          gap: 1,
          children: [
            {
              type: 'Caption',
              value: 'Recommended unit',
            },
            {
              type: 'Row',
              gap: 2,
              wrap: 'wrap',
              children: [
                {
                  type: 'Badge',
                  key: 0,
                  label: 'Medical',
                  color: 'info',
                },
                {
                  type: 'Badge',
                  key: 1,
                  label: 'Respiratory.',
                  color: 'info',
                },
                {
                  type: 'Badge',
                  key: 2,
                  label: 'Indigent.',
                  color: 'info',
                },
              ],
            },
          ],
        },
        {
          type: 'Divider',
        },
        {
          type: 'Col',
          gap: 1,
          children: [
            {
              type: 'Caption',
              value: 'Registered Guide',
            },
            {
              type: 'Text',
              value: 'In advance, in the official sector.App/Public number appointments registered; no live number available on the day; visitation day in advance15The minute to the self-help./window to take the number.',
              size: 'sm',
            },
            {
              type: 'Row',
              children: [
                {
                  type: 'Button',
                  label: 'Go ahead and sign.',
                  style: 'primary',
                  iconStart: 'calendar',
                  onClickAction: {
                    type: 'register.open',
                    payload: {
                      hospital: 'Example: City People \' s Hospital',
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'Col',
          gap: 1,
          children: [
            {
              type: 'Caption',
              value: 'Travel proposal',
            },
            {
              type: 'Text',
              value: 'Subway1LineXStop!AWalking through the mouth.8Minutes; parking lot on the east side (less space, peak recommended public transport).',
              size: 'sm',
            },
          ],
        },
        {
          type: 'Divider',
        },
        {
          type: 'Col',
          gap: 1,
          children: [
            {
              type: 'Caption',
              value: 'List of consultation items',
            },
            {
              type: 'Checkbox',
              key: 'id',
              name: 'carry.id',
              label: 'Resident identity card/Passports',
              defaultChecked: false,
              required: true,
            },
            {
              type: 'Checkbox',
              key: 'ins',
              name: 'carry.ins',
              label: 'Health card/Commercial insurance certificates',
              defaultChecked: false,
              required: true,
            },
            {
              type: 'Checkbox',
              key: 'card',
              name: 'carry.card',
              label: 'Clinical cards (if any)',
              defaultChecked: false,
            },
            {
              type: 'Checkbox',
              key: 'records',
              name: 'carry.records',
              label: 'Previous medical history/Discharged from hospital./Image/Checklist',
              defaultChecked: false,
              required: true,
            },
            {
              type: 'Checkbox',
              key: 'meds',
              name: 'carry.meds',
              label: 'List of current medications and allergies',
              defaultChecked: false,
              required: true,
            },
            {
              type: 'Checkbox',
              key: 'list',
              name: 'carry.list',
              label: 'Near1Symptoms recorded (body temperature)/Blood pressure./- Blood sugar, etc.)',
              defaultChecked: false,
            },
            {
              type: 'Checkbox',
              key: 'cash',
              name: 'carry.cash',
              label: 'Cash/Bank card/Pay for the phone.',
              defaultChecked: false,
            },
            {
              type: 'Checkbox',
              key: 'mask',
              name: 'carry.mask',
              label: 'Masks and tissues.',
              defaultChecked: false,
            },
            {
              type: 'Checkbox',
              key: 'power',
              name: 'carry.power',
              label: 'Cell phones and chargeables.',
              defaultChecked: false,
            },
          ],
        },
        {
          type: 'Divider',
        },
        {
          type: 'Col',
          gap: 2,
          children: [
            {
              type: 'Caption',
              value: 'Slight case (to doctor)',
            },
            {
              type: 'Textarea',
              name: 'summary',
              rows: 6,
              autoResize: true,
              maxRows: 12,
              defaultValue:
                'Principal:\\nTime of illness:\\nSymptoms and causes:\\nSymptoms:\\nPast history:\\nAllergies:\\n- It\'s a drug history.\\nFamily history:\\nBody temperature/Blood pressure:\\nChecked and results:\\nThis visit is for:',
            },
            {
              type: 'Row',
              children: [
                {
                  type: 'Button',
                  label: 'Copy Summary',
                  variant: 'outline',
                  iconStart: 'square-text',
                  onClickAction: {
                    type: 'summary.copy',
                  },
                },
                {
                  type: 'Spacer',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const defaultJson2 = {
  type: 'Card',
  theme: 'dark',
  size: 'sm',
  padding: 8,
  background: 'linear-gradient(111deg, #1769C8 0%, #258AE3 56.92%, #31A3F8 100%)',
  children: [
    {
      type: 'Col',
      align: 'center',
      gap: 3,
      children: [
        {
          type: 'Image',
          src: 'https://cdn.openai.com/API/storybook/mixed-sun.png',
          size: 60,
        },
        {
          type: 'Row',
          align: 'center',
          gap: 2,
          children: [
            {
              type: 'Title',
              value: '47°',
              size: '2xl',
              weight: 'normal',
              color: 'alpha-70',
            },
            {
              type: 'Title',
              value: '69°',
              size: '2xl',
              color: 'emphasis',
              weight: 'normal',
            },
          ],
        },
        {
          type: 'Caption',
          value: 'San Francisco, CA',
          color: 'emphasis',
        },
        {
          type: 'Text',
          value: 'Partly sunny skies accompanied by some clouds',
          textAlign: 'center',
        },
        {
          type: 'Row',
          gap: 6,
          children: [
            {
              type: 'Col',
              align: 'center',
              gap: 0,
              children: [
                {
                  type: 'Image',
                  src: 'https://cdn.openai.com/API/storybook/mostly-sunny.png',
                  size: 40,
                },
                {
                  type: 'Text',
                  value: '54°',
                },
              ],
            },
            {
              type: 'Col',
              align: 'center',
              gap: 0,
              children: [
                {
                  type: 'Image',
                  src: 'https://cdn.openai.com/API/storybook/rain.png',
                  size: 40,
                },
                {
                  type: 'Text',
                  value: '54°',
                },
              ],
            },
            {
              type: 'Col',
              align: 'center',
              gap: 0,
              children: [
                {
                  type: 'Image',
                  src: 'https://cdn.openai.com/API/storybook/mixed-sun.png',
                  size: 40,
                },
                {
                  type: 'Text',
                  value: '54°',
                },
              ],
            },
            {
              type: 'Col',
              align: 'center',
              gap: 0,
              children: [
                {
                  type: 'Image',
                  src: 'https://cdn.openai.com/API/storybook/windy.png',
                  size: 40,
                },
                {
                  type: 'Text',
                  value: '54°',
                },
              ],
            },
            {
              type: 'Col',
              align: 'center',
              gap: 0,
              children: [
                {
                  type: 'Image',
                  src: 'https://cdn.openai.com/API/storybook/mostly-sunny.png',
                  size: 40,
                },
                {
                  type: 'Text',
                  value: '54°',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
